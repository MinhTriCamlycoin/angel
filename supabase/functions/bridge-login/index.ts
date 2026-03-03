import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Normalize identity payload to handle different response shapes
function normalizeIdentity(raw: Record<string, unknown>) {
  const r = raw as any;

  const email =
    r.email ||
    r.user?.email ||
    r.profile?.email ||
    r.data?.email ||
    r.token_info?.email ||
    null;

  const funUserId =
    r.sub ||
    r.fun_id ||
    r.user?.id ||
    r.user?.sub ||
    r.data?.sub ||
    null;

  const displayName =
    r.username ||
    r.display_name ||
    r.full_name ||
    r.name ||
    r.user?.username ||
    r.user?.display_name ||
    r.user?.full_name ||
    r.profile?.display_name ||
    (typeof email === "string" ? email.split("@")[0] : null);

  const avatarUrl =
    r.avatar_url ||
    r.user?.avatar_url ||
    r.profile?.avatar_url ||
    null;

  return { email, funUserId, displayName, avatarUrl };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fun_access_token, hint_email } = await req.json();

    if (!fun_access_token) {
      return new Response(
        JSON.stringify({ error: "Missing fun_access_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify token with FUN Profile sso-verify
    const funApiUrl = Deno.env.get("FUN_PROFILE_API_URL");
    if (!funApiUrl) {
      console.error("FUN_PROFILE_API_URL not configured");
      return new Response(
        JSON.stringify({ error: "SSO not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyRes = await fetch(`${funApiUrl}/sso-verify`, {
      method: "GET",
      headers: { Authorization: `Bearer ${fun_access_token}` },
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text().catch(() => "Unknown error");
      console.error("SSO verify failed:", verifyRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Token verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rawIdentity = await verifyRes.json();

    // Safe diagnostic logging (no sensitive data)
    const topKeys = Object.keys(rawIdentity);
    console.log("[bridge-login] Identity top-level keys:", topKeys.join(", "));
    if (rawIdentity.user && typeof rawIdentity.user === "object") {
      console.log("[bridge-login] Identity.user keys:", Object.keys(rawIdentity.user).join(", "));
    }
    if (rawIdentity.profile && typeof rawIdentity.profile === "object") {
      console.log("[bridge-login] Identity.profile keys:", Object.keys(rawIdentity.profile).join(", "));
    }

    // 2. Normalize identity
    const normalized = normalizeIdentity(rawIdentity);
    console.log("[bridge-login] Normalized: email=", normalized.email ? "present" : "MISSING",
      ", funUserId=", normalized.funUserId ? "present" : "MISSING",
      ", displayName=", normalized.displayName || "none");

    // Fallback 1: decode JWT payload for email claim
    if (!normalized.email) {
      try {
        const parts = fun_access_token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload.email) {
            normalized.email = payload.email;
            console.log("[bridge-login] Email recovered from JWT payload");
          }
        }
      } catch (_e) {
        // ignore decode errors
      }
    }

    // Fallback 2: trust hint_email from client (token already verified above)
    if (!normalized.email && hint_email && typeof hint_email === "string") {
      normalized.email = hint_email;
      console.log("[bridge-login] Email recovered from hint_email");
    }

    if (!normalized.email) {
      return new Response(
        JSON.stringify({
          error: "Missing email in FUN identity payload",
          debug_keys: topKeys,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Helper: paginated user lookup by email
    async function findUserByEmail(email: string) {
      const target = email.toLowerCase();
      let page = 1;
      const perPage = 100;
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error("[bridge-login] listUsers error page", page, error.message);
          return null;
        }
        const match = data.users.find((u: any) => u.email?.toLowerCase() === target);
        if (match) return match;
        if (data.users.length < perPage) break;
        page++;
      }
      return null;
    }

    // 4. Find or create user by email (paginated + conflict recovery)
    let userId: string;

    const existingUser = await findUserByEmail(normalized.email);

    if (existingUser) {
      userId = existingUser.id;
      console.log("[bridge-login] Found existing user (paginated)");
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: normalized.email,
        email_confirm: true,
        user_metadata: {
          display_name: normalized.displayName,
          avatar_url: normalized.avatarUrl,
          source: "fun_profile_sso",
        },
      });

      if (createError) {
        // Recover on email_exists conflict
        if (createError.message?.toLowerCase().includes("email") ||
            (createError as any).code === "email_exists") {
          console.log("[bridge-login] createUser conflict (email_exists), recovering...");
          const recovered = await findUserByEmail(normalized.email);
          if (recovered) {
            userId = recovered.id;
            console.log("[bridge-login] Recovered user after conflict");
          } else {
            console.error("[bridge-login] Could not recover user after conflict");
            return new Response(
              JSON.stringify({ error: "Failed to resolve user account" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          console.error("Failed to create user:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create user account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (!newUser.user) {
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        userId = newUser.user.id;
        console.log("[bridge-login] Created new user");
      }
    }

    // 5. Upsert fun_id_links
    if (normalized.funUserId) {
      await supabase
        .from("fun_id_links")
        .upsert(
          {
            angel_user_id: userId,
            fun_profile_user_id: normalized.funUserId,
            status: "active",
            linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "angel_user_id" }
        );
    }

    // 6. Upsert profile info
    const profileUpdate: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (normalized.displayName) profileUpdate.display_name = normalized.displayName;
    if (normalized.avatarUrl) profileUpdate.avatar_url = normalized.avatarUrl;

    await supabase
      .from("profiles")
      .upsert(profileUpdate, { onConflict: "user_id" });

    // 7. Generate session using magic link approach
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalized.email,
    });

    if (linkError || !linkData) {
      console.error("Failed to generate link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token from the link and verify it to get session
    const linkUrl = new URL(linkData.properties.action_link);
    const token_hash = linkUrl.searchParams.get("token") || 
                        linkUrl.hash?.match(/token=([^&]+)/)?.[1] ||
                        linkUrl.searchParams.get("token_hash");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);

    let sessionData;
    
    if (token_hash) {
      const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (otpError || !otpData.session) {
        console.error("OTP verify failed:", otpError);
      } else {
        sessionData = otpData.session;
      }
    }

    if (!sessionData) {
      const tempPassword = crypto.randomUUID();
      await supabase.auth.admin.updateUser(userId, { password: tempPassword });
      
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: normalized.email,
        password: tempPassword,
      });

      if (signInError || !signInData.session) {
        console.error("Fallback sign-in failed:", signInError);
        return new Response(
          JSON.stringify({ error: "Failed to create session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      sessionData = signInData.session;
    }

    return new Response(
      JSON.stringify({
        session: {
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        },
        user_id: userId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Bridge login error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
