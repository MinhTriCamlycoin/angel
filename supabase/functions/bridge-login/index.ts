import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fun_access_token } = await req.json();

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

    const identity = await verifyRes.json();
    // identity: { sub, fun_id, username, email, avatar_url, wallet_address, scopes, ... }

    if (!identity.email) {
      return new Response(
        JSON.stringify({ error: "No email in FUN Profile identity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. Find or create user by email
    let userId: string;

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Failed to list users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to look up user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = existingUsers.users.find(
      (u) => u.email?.toLowerCase() === identity.email.toLowerCase()
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: identity.email,
        email_confirm: true,
        user_metadata: {
          display_name: identity.username || identity.full_name || identity.email.split("@")[0],
          avatar_url: identity.avatar_url || null,
          source: "fun_profile_sso",
        },
      });

      if (createError || !newUser.user) {
        console.error("Failed to create user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
    }

    // 4. Upsert fun_id_links
    const funUserId = identity.sub || identity.fun_id || null;
    if (funUserId) {
      await supabase
        .from("fun_id_links")
        .upsert(
          {
            angel_user_id: userId,
            fun_profile_user_id: funUserId,
            status: "active",
            linked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "angel_user_id" }
        );
    }

    // 5. Upsert profile info
    const profileUpdate: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (identity.username) profileUpdate.display_name = identity.username;
    if (identity.avatar_url) profileUpdate.avatar_url = identity.avatar_url;

    await supabase
      .from("profiles")
      .upsert(profileUpdate, { onConflict: "user_id" });

    // 6. Generate session using magic link approach
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: identity.email,
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

    // Use the OTP verification to get a proper session
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);

    // Try to verify the token hash to get session
    let sessionData;
    
    if (token_hash) {
      const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (otpError || !otpData.session) {
        console.error("OTP verify failed:", otpError);
        // Fallback: try email OTP approach
      } else {
        sessionData = otpData.session;
      }
    }

    if (!sessionData) {
      // Fallback: use admin to create a direct session via sign in
      // Generate a temporary password, sign in, then remove it
      const tempPassword = crypto.randomUUID();
      
      await supabase.auth.admin.updateUser(userId, { password: tempPassword });
      
      const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
        email: identity.email,
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
