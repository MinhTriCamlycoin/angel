import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_EPOCH_MINT_POOL = 5_000_000;
const ANTI_WHALE_CAP = 0.03; // 3%

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse target period (default: current open cycle)
    let cycleId: string | null = null;
    try {
      const body = await req.json();
      cycleId = body.cycle_id || null;
    } catch { /* no body */ }

    // Get the cycle to allocate
    let cycle: Record<string, unknown> | null = null;
    if (cycleId) {
      const { data } = await supabase
        .from('pplp_mint_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();
      cycle = data;
    } else {
      // Get current open cycle
      const { data } = await supabase
        .from('pplp_mint_cycles')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      cycle = data;
    }

    if (!cycle) {
      return new Response(JSON.stringify({ error: 'No cycle found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const epochStart = (cycle.start_date as string).split('T')[0];
    const epochEnd = (cycle.end_date as string).split('T')[0];
    const period = epochStart.substring(0, 7); // "YYYY-MM"

    console.log(`[EpochAllocate] Processing cycle #${cycle.cycle_number} (${period})`);

    // ========== STEP 1: Aggregate Light Scores from features_user_day ==========
    const { data: dailyScores, error: scoreErr } = await supabase
      .from('features_user_day')
      .select('user_id, daily_light_score')
      .gte('date', epochStart)
      .lte('date', epochEnd)
      .gt('daily_light_score', 0);

    if (scoreErr) throw scoreErr;

    if (!dailyScores || dailyScores.length === 0) {
      // Close cycle with no contributions
      await supabase.from('pplp_mint_cycles').update({
        status: 'distributed',
        total_mint_pool: 0,
        total_light_contribution: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', cycle.id);

      return new Response(JSON.stringify({
        success: true,
        message: 'No contributions in this epoch',
        allocated_users: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Aggregate by user
    const userScores = new Map<string, number>();
    let totalLight = 0;
    for (const row of dailyScores) {
      const score = row.daily_light_score || 0;
      userScores.set(row.user_id, (userScores.get(row.user_id) || 0) + score);
      totalLight += score;
    }

    console.log(`[EpochAllocate] ${userScores.size} users, total light: ${totalLight}`);

    // ========== STEP 2: Eligibility Check (§13) ==========
    const eligibleUsers = new Map<string, number>();
    const ineligibleUsers: Array<{ user_id: string; contribution: number; reason: string }> = [];

    for (const [userId, score] of userScores) {
      const { data: eligibility } = await supabase.rpc('check_mint_eligibility', {
        _user_id: userId,
        _epoch_start: epochStart,
        _epoch_end: epochEnd,
      });

      if (eligibility && eligibility.eligible) {
        eligibleUsers.set(userId, score);
      } else {
        ineligibleUsers.push({
          user_id: userId,
          contribution: score,
          reason: eligibility?.reason || 'UNKNOWN',
        });
      }
    }

    let eligibleTotal = 0;
    for (const [, score] of eligibleUsers) {
      eligibleTotal += score;
    }

    const mintPool = Math.min(MAX_EPOCH_MINT_POOL, eligibleTotal);

    console.log(`[EpochAllocate] Eligible: ${eligibleUsers.size}, Ineligible: ${ineligibleUsers.length}, Pool: ${mintPool}`);

    // ========== STEP 3: Anti-Whale Iterative Redistribution (§14) ==========
    const allocations = applyAntiWhaleCap(eligibleUsers, eligibleTotal, mintPool, ANTI_WHALE_CAP);

    // ========== STEP 4: Insert pplp_mint_allocations ==========
    const allocationRecords = [
      ...allocations.map(a => ({
        cycle_id: cycle!.id as string,
        user_id: a.userId,
        user_light_contribution: a.contribution,
        allocation_ratio: a.ratio,
        fun_allocated: a.allocated,
        status: 'pending',
        eligible: true,
        ineligibility_reason: null,
      })),
      ...ineligibleUsers.map(u => ({
        cycle_id: cycle!.id as string,
        user_id: u.user_id,
        user_light_contribution: u.contribution,
        allocation_ratio: 0,
        fun_allocated: 0,
        status: 'ineligible',
        eligible: false,
        ineligibility_reason: u.reason,
      })),
    ];

    if (allocationRecords.length > 0) {
      // Batch insert in chunks of 200
      for (let i = 0; i < allocationRecords.length; i += 200) {
        const chunk = allocationRecords.slice(i, i + 200);
        const { error: allocErr } = await supabase
          .from('pplp_mint_allocations')
          .upsert(chunk, { onConflict: 'cycle_id,user_id' });
        if (allocErr) console.error('[EpochAllocate] Allocation insert error:', allocErr);
      }
    }

    // ========== STEP 5: Create batch mint requests for eligible users ==========
    let mintRequestsCreated = 0;
    for (const alloc of allocations) {
      if (alloc.allocated <= 0) continue;

      // Get user's wallet address
      const { data: wallet } = await supabase
        .from('user_wallet_addresses')
        .select('wallet_address')
        .eq('user_id', alloc.userId)
        .limit(1)
        .maybeSingle();

      const recipientAddress = wallet?.wallet_address || '0x' + '0'.repeat(40);

      // Create a single epoch mint request per user
      const actionHash = '0x' + Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode('FUN_EPOCH_REWARD'))
        )
      ).map(b => b.toString(16).padStart(2, '0')).join('');

      const evidenceHash = '0x' + Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', new TextEncoder().encode(
            `epoch:${period}:user:${alloc.userId}:light:${alloc.contribution}`
          ))
        )
      ).map(b => b.toString(16).padStart(2, '0')).join('');

      // Use epoch-based action_id format: cycle_id as the action reference
      const { error: mrErr } = await supabase
        .from('pplp_mint_requests')
        .upsert({
          action_id: `${cycle!.id}::${alloc.userId}`, // Unique per cycle+user
          actor_id: alloc.userId,
          recipient_address: recipientAddress,
          amount: alloc.allocated,
          action_hash: actionHash,
          evidence_hash: evidenceHash,
          policy_version: 1,
          nonce: 0,
          status: 'pending',
          signature: null,
          signer_address: null,
          tx_hash: null,
          minted_at: null,
        }, { onConflict: 'action_id' });

      if (mrErr) {
        console.error(`[EpochAllocate] Mint request error for ${alloc.userId}:`, mrErr);
      } else {
        mintRequestsCreated++;
      }
    }

    // ========== STEP 6: Update cycle status ==========
    await supabase.from('pplp_mint_cycles').update({
      status: 'distributed',
      total_mint_pool: mintPool,
      total_light_contribution: eligibleTotal,
      updated_at: new Date().toISOString(),
    }).eq('id', cycle.id);

    // ========== STEP 7: Transparency Snapshot ==========
    const { data: rule } = await supabase
      .from('scoring_rules')
      .select('rule_version')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    const { count: mentorChains } = await supabase
      .from('pplp_behavior_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_type', 'mentorship')
      .eq('status', 'completed')
      .gte('completed_at', cycle.start_date as string)
      .lte('completed_at', cycle.end_date as string);

    const { count: valueLoops } = await supabase
      .from('pplp_behavior_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_type', 'value_creation')
      .eq('status', 'completed')
      .gte('completed_at', cycle.start_date as string)
      .lte('completed_at', cycle.end_date as string);

    await supabase.from('transparency_snapshots').insert({
      epoch_id: `Epoch-${period}`,
      total_light_system: eligibleTotal,
      total_fun_minted: mintPool,
      allocation_by_level: computeLevelBreakdown(allocations),
      mentor_chains_completed: mentorChains || 0,
      value_loops_completed: valueLoops || 0,
      active_users: allocations.length,
      rule_version: rule?.rule_version || 'LS-Math-v1.0',
    });

    const result = {
      success: true,
      cycle_id: cycle.id,
      cycle_number: cycle.cycle_number,
      period,
      total_light: eligibleTotal,
      mint_pool: mintPool,
      eligible_users: allocations.length,
      ineligible_users: ineligibleUsers.length,
      mint_requests_created: mintRequestsCreated,
      anti_whale_cap: ANTI_WHALE_CAP,
      top_allocations: allocations
        .sort((a, b) => b.allocated - a.allocated)
        .slice(0, 10)
        .map(a => ({ user_id: a.userId, fun: a.allocated, ratio: a.ratio })),
    };

    console.log(`[EpochAllocate] Done: ${mintRequestsCreated} mint requests for ${allocations.length} users, pool: ${mintPool} FUN`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EpochAllocate] Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// ========== Anti-Whale Cap with Iterative Redistribution ==========
function applyAntiWhaleCap(
  userScores: Map<string, number>,
  totalContribution: number,
  mintPool: number,
  maxShare: number,
): Array<{ userId: string; contribution: number; ratio: number; allocated: number }> {
  if (totalContribution <= 0 || mintPool <= 0) return [];

  const shares = new Map<string, number>();
  const capped = new Set<string>();

  // Initialize proportional shares
  for (const [userId, score] of userScores) {
    shares.set(userId, score / totalContribution);
  }

  // Iterative redistribution (max 10 rounds)
  for (let iter = 0; iter < 10; iter++) {
    let excess = 0;
    let uncappedTotal = 0;

    for (const [userId, share] of shares) {
      if (capped.has(userId)) continue;
      if (share > maxShare) {
        excess += (share - maxShare) * mintPool;
        shares.set(userId, maxShare);
        capped.add(userId);
      } else {
        uncappedTotal += userScores.get(userId) || 0;
      }
    }

    if (excess <= 0) break;

    // Redistribute excess proportionally among uncapped
    for (const [userId] of shares) {
      if (capped.has(userId)) continue;
      const contribution = userScores.get(userId) || 0;
      const bonus = uncappedTotal > 0 ? (contribution / uncappedTotal) * excess / mintPool : 0;
      shares.set(userId, (shares.get(userId) || 0) + bonus);
    }
  }

  const result: Array<{ userId: string; contribution: number; ratio: number; allocated: number }> = [];
  for (const [userId, share] of shares) {
    const allocated = Math.floor(mintPool * share);
    if (allocated > 0) {
      result.push({
        userId,
        contribution: userScores.get(userId) || 0,
        ratio: Math.round(share * 10000) / 10000,
        allocated,
      });
    }
  }

  return result;
}

// ========== Compute allocation breakdown by light level ==========
function computeLevelBreakdown(
  allocations: Array<{ contribution: number; allocated: number }>,
): Record<string, number> {
  const levels = { seed: 0, contributor: 0, builder: 0, guardian: 0, architect: 0 };
  for (const a of allocations) {
    if (a.contribution >= 2000) levels.architect += a.allocated;
    else if (a.contribution >= 1000) levels.guardian += a.allocated;
    else if (a.contribution >= 500) levels.builder += a.allocated;
    else if (a.contribution >= 200) levels.contributor += a.allocated;
    else levels.seed += a.allocated;
  }
  return levels;
}
