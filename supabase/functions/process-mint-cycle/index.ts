import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_WEEKLY_MINT_POOL = 5_000_000;
const DEFAULT_MAX_SHARE = 0.03; // 3% anti-whale cap

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { cycle_type = 'weekly' } = await req.json().catch(() => ({}));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Check for existing open cycle
    const { data: existingCycle } = await supabase
      .from('pplp_mint_cycles')
      .select('*')
      .eq('status', 'open')
      .eq('cycle_type', cycle_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let cycle = existingCycle;

    // If cycle ended, close it and process
    if (cycle && new Date(cycle.end_date) <= now) {
      console.log(`[MintCycle] Processing cycle ${cycle.id}`);
      const result = await processCycle(supabase, cycle, cycle_type, weekEnd, now);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no open cycle, create one
    if (!cycle) {
      cycle = await createNewCycle(supabase, cycle_type, weekStart, weekEnd);
      if (!cycle) {
        return new Response(JSON.stringify({ error: 'Failed to create cycle' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cycle is active',
      cycle_id: cycle.id,
      cycle_number: cycle.cycle_number,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      status: cycle.status,
      max_share_per_user: cycle.max_share_per_user || DEFAULT_MAX_SHARE,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[MintCycle] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processCycle(
  supabase: ReturnType<typeof createClient>,
  cycle: Record<string, unknown>,
  cycleType: string,
  weekEnd: Date,
  now: Date,
) {
  const maxSharePerUser = Number(cycle.max_share_per_user) || DEFAULT_MAX_SHARE;

  // ========== ELIGIBILITY GATE (§13) ==========
  // Get all users who contributed in this cycle
  const { data: contributions } = await supabase
    .from('pplp_scores')
    .select('action_id, final_reward')
    .gte('created_at', cycle.start_date as string)
    .lte('created_at', cycle.end_date as string)
    .eq('decision', 'pass');

  if (!contributions || contributions.length === 0) {
    await supabase.from('pplp_mint_cycles').update({ status: 'closed', updated_at: now.toISOString() }).eq('id', cycle.id);
    return { success: true, message: 'Cycle closed with no contributions' };
  }

  // Get actor_id for each action
  const actionIds = contributions.map((c: { action_id: string }) => c.action_id);
  const { data: actions } = await supabase.from('pplp_actions').select('id, actor_id').in('id', actionIds);

  const actorMap = new Map<string, string>();
  (actions || []).forEach((a: { id: string; actor_id: string }) => actorMap.set(a.id, a.actor_id));

  // Aggregate by user
  const userContributions = new Map<string, number>();
  let totalContribution = 0;
  for (const score of contributions) {
    const userId = actorMap.get(score.action_id);
    if (!userId) continue;
    const reward = score.final_reward || 0;
    userContributions.set(userId, (userContributions.get(userId) || 0) + reward);
    totalContribution += reward;
  }

  // Check eligibility for each user
  const epochStart = (cycle.start_date as string).split('T')[0];
  const epochEnd = (cycle.end_date as string).split('T')[0];
  const eligibleUsers = new Map<string, number>();
  const ineligibleUsers: Array<{ user_id: string; reason: string }> = [];

  for (const [userId, contribution] of userContributions) {
    const { data: eligibility } = await supabase.rpc('check_mint_eligibility', {
      _user_id: userId,
      _epoch_start: epochStart,
      _epoch_end: epochEnd,
    });

    if (eligibility && eligibility.eligible) {
      eligibleUsers.set(userId, contribution);
    } else {
      ineligibleUsers.push({
        user_id: userId,
        reason: eligibility?.reason || 'UNKNOWN',
      });
    }
  }

  // Recalculate total with only eligible users
  let eligibleTotal = 0;
  for (const [, contribution] of eligibleUsers) {
    eligibleTotal += contribution;
  }

  const mintPool = Math.min(MAX_WEEKLY_MINT_POOL, eligibleTotal);

  // ========== ANTI-WHALE: Iterative redistribution ==========
  const allocations = applyAntiWhaleCapIterative(eligibleUsers, eligibleTotal, mintPool, maxSharePerUser, cycle.id as string);

  // Add ineligible entries with eligible=false
  const ineligibleAllocations = ineligibleUsers.map(u => ({
    cycle_id: cycle.id as string,
    user_id: u.user_id,
    user_light_contribution: userContributions.get(u.user_id) || 0,
    allocation_ratio: 0,
    fun_allocated: 0,
    status: 'ineligible',
    eligible: false,
    ineligibility_reason: u.reason,
  }));

  // Insert all allocations
  const allAllocations = [...allocations, ...ineligibleAllocations];
  if (allAllocations.length > 0) {
    const { error: allocError } = await supabase
      .from('pplp_mint_allocations')
      .upsert(allAllocations, { onConflict: 'cycle_id,user_id' });
    if (allocError) console.error('[MintCycle] Allocation insert error:', allocError);
  }

  // Get active rule version
  const { data: rule } = await supabase
    .from('scoring_rules')
    .select('rule_version')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const ruleVersion = rule?.rule_version || 'V1.0';

  // Update cycle status
  await supabase.from('pplp_mint_cycles').update({
    status: 'distributed',
    total_mint_pool: mintPool,
    total_light_contribution: eligibleTotal,
    updated_at: now.toISOString(),
  }).eq('id', cycle.id);

  // ========== TRANSPARENCY SNAPSHOT ==========
  await createTransparencySnapshot(supabase, cycle, mintPool, eligibleTotal, allocations.length, ruleVersion);

  // Create next cycle
  await createNewCycle(supabase, cycleType, weekEnd, new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000));

  console.log(`[MintCycle] Distributed ${mintPool} FUN to ${allocations.length} eligible users (${ineligibleUsers.length} ineligible, anti-whale cap: ${maxSharePerUser * 100}%)`);

  return {
    success: true,
    processed_cycle: cycle.id,
    total_contribution: eligibleTotal,
    mint_pool: mintPool,
    users_allocated: allocations.length,
    users_ineligible: ineligibleUsers.length,
    anti_whale_cap: maxSharePerUser,
    rule_version: ruleVersion,
  };
}

// ========== ITERATIVE Anti-Whale Cap (loops until no excess) ==========
function applyAntiWhaleCapIterative(
  userContributions: Map<string, number>,
  totalContribution: number,
  mintPool: number,
  maxShare: number,
  cycleId: string,
) {
  const allocations: Array<{
    cycle_id: string; user_id: string; user_light_contribution: number;
    allocation_ratio: number; fun_allocated: number; status: string;
    eligible: boolean; ineligibility_reason: string | null;
  }> = [];

  if (totalContribution <= 0 || mintPool <= 0) return allocations;

  // Iterative redistribution
  const shares = new Map<string, number>();
  const capped = new Set<string>();
  let remaining = mintPool;
  let uncappedTotal = totalContribution;
  const maxIterations = 10;

  // Initialize shares proportionally
  for (const [userId, contribution] of userContributions) {
    shares.set(userId, contribution / totalContribution);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    let excess = 0;
    let newUncappedTotal = 0;

    for (const [userId, share] of shares) {
      if (capped.has(userId)) continue;
      if (share > maxShare) {
        excess += (share - maxShare) * mintPool;
        shares.set(userId, maxShare);
        capped.set(userId, true);
      } else {
        newUncappedTotal += userContributions.get(userId) || 0;
      }
    }

    if (excess <= 0) break;

    // Redistribute excess proportionally among uncapped users
    for (const [userId] of shares) {
      if (capped.has(userId)) continue;
      const contribution = userContributions.get(userId) || 0;
      const bonus = newUncappedTotal > 0 ? (contribution / newUncappedTotal) * excess / mintPool : 0;
      shares.set(userId, (shares.get(userId) || 0) + bonus);
    }
    uncappedTotal = newUncappedTotal;
  }

  for (const [userId, share] of shares) {
    const allocated = Math.floor(mintPool * share);
    if (allocated > 0) {
      allocations.push({
        cycle_id: cycleId,
        user_id: userId,
        user_light_contribution: userContributions.get(userId) || 0,
        allocation_ratio: Math.round(share * 10000) / 10000,
        fun_allocated: allocated,
        status: 'pending',
        eligible: true,
        ineligibility_reason: null,
      });
    }
  }

  return allocations;
}

async function createTransparencySnapshot(
  supabase: ReturnType<typeof createClient>,
  cycle: Record<string, unknown>,
  mintPool: number,
  totalLight: number,
  activeUsers: number,
  ruleVersion: string,
) {
  try {
    // Count completed mentor chains this cycle
    const { count: mentorChains } = await supabase
      .from('pplp_behavior_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_type', 'mentorship')
      .eq('status', 'completed')
      .gte('completed_at', cycle.start_date as string)
      .lte('completed_at', cycle.end_date as string);

    // Count completed value loops
    const { count: valueLoops } = await supabase
      .from('pplp_behavior_sequences')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_type', 'value_creation')
      .eq('status', 'completed')
      .gte('completed_at', cycle.start_date as string)
      .lte('completed_at', cycle.end_date as string);

    await supabase.from('transparency_snapshots').insert({
      epoch_id: `Cycle-${cycle.cycle_number}`,
      total_light_system: totalLight,
      total_fun_minted: mintPool,
      allocation_by_level: { seed: 0, sprout: 0, builder: 0, guardian: 0, architect: 0 },
      mentor_chains_completed: mentorChains || 0,
      value_loops_completed: valueLoops || 0,
      active_users: activeUsers,
      rule_version: ruleVersion,
    });
  } catch (err) {
    console.error('[MintCycle] Transparency snapshot error:', err);
  }
}

async function createNewCycle(
  supabase: ReturnType<typeof createClient>,
  cycleType: string,
  start: Date,
  end: Date,
) {
  const { data: lastCycle } = await supabase
    .from('pplp_mint_cycles')
    .select('cycle_number')
    .eq('cycle_type', cycleType)
    .order('cycle_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumber = (lastCycle?.cycle_number || 0) + 1;

  const { data: newCycle, error } = await supabase
    .from('pplp_mint_cycles')
    .insert({
      cycle_number: nextNumber,
      cycle_type: cycleType,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      status: 'open',
      max_share_per_user: DEFAULT_MAX_SHARE,
    })
    .select()
    .single();

  if (error) {
    console.error('[MintCycle] Create cycle error:', error);
    return null;
  }
  return newCycle;
}
