import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_WEEKLY_MINT_POOL = 5_000_000; // 5M FUN/tuần max

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { cycle_type = 'weekly' } = await req.json().catch(() => ({}));

    // 1. Find or create the current cycle
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Sunday
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
      // Process this cycle
      console.log(`[MintCycle] Processing cycle ${cycle.id}`);

      // 2. Aggregate total light contribution in this period
      const { data: contributions } = await supabase
        .from('pplp_scores')
        .select('action_id, final_reward')
        .gte('created_at', cycle.start_date)
        .lte('created_at', cycle.end_date)
        .eq('decision', 'pass');

      if (!contributions || contributions.length === 0) {
        // Close empty cycle
        await supabase
          .from('pplp_mint_cycles')
          .update({ status: 'closed', updated_at: now.toISOString() })
          .eq('id', cycle.id);

        return new Response(
          JSON.stringify({ success: true, message: 'Cycle closed with no contributions' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get actor_id for each action
      const actionIds = contributions.map(c => c.action_id);
      const { data: actions } = await supabase
        .from('pplp_actions')
        .select('id, actor_id')
        .in('id', actionIds);

      const actorMap = new Map<string, string>();
      actions?.forEach(a => actorMap.set(a.id, a.actor_id));

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

      // 3. Determine mint pool (capped)
      const mintPool = Math.min(MAX_WEEKLY_MINT_POOL, totalContribution);

      // 4. Allocate per user
      const allocations: Array<{
        cycle_id: string;
        user_id: string;
        user_light_contribution: number;
        allocation_ratio: number;
        fun_allocated: number;
        status: string;
      }> = [];

      for (const [userId, contribution] of userContributions) {
        const ratio = totalContribution > 0 ? contribution / totalContribution : 0;
        const allocated = Math.floor(mintPool * ratio);
        if (allocated > 0) {
          allocations.push({
            cycle_id: cycle.id,
            user_id: userId,
            user_light_contribution: contribution,
            allocation_ratio: Math.round(ratio * 10000) / 10000,
            fun_allocated: allocated,
            status: 'pending',
          });
        }
      }

      // Insert allocations
      if (allocations.length > 0) {
        const { error: allocError } = await supabase
          .from('pplp_mint_allocations')
          .upsert(allocations, { onConflict: 'cycle_id,user_id' });

        if (allocError) {
          console.error('[MintCycle] Allocation insert error:', allocError);
        }
      }

      // Update cycle status
      await supabase
        .from('pplp_mint_cycles')
        .update({
          status: 'distributed',
          total_mint_pool: mintPool,
          total_light_contribution: totalContribution,
          updated_at: now.toISOString(),
        })
        .eq('id', cycle.id);

      console.log(`[MintCycle] Distributed ${mintPool} FUN to ${allocations.length} users`);

      // Create next cycle
      const { data: lastCycle } = await supabase
        .from('pplp_mint_cycles')
        .select('cycle_number')
        .eq('cycle_type', cycle_type)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .single();

      const nextNumber = (lastCycle?.cycle_number || 0) + 1;
      await supabase
        .from('pplp_mint_cycles')
        .insert({
          cycle_number: nextNumber,
          cycle_type,
          start_date: weekEnd.toISOString(),
          end_date: new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'open',
        });

      return new Response(
        JSON.stringify({
          success: true,
          processed_cycle: cycle.id,
          total_contribution: totalContribution,
          mint_pool: mintPool,
          users_allocated: allocations.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no open cycle, create one
    if (!cycle) {
      const { data: lastCycle } = await supabase
        .from('pplp_mint_cycles')
        .select('cycle_number')
        .eq('cycle_type', cycle_type)
        .order('cycle_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (lastCycle?.cycle_number || 0) + 1;

      const { data: newCycle, error: createError } = await supabase
        .from('pplp_mint_cycles')
        .insert({
          cycle_number: nextNumber,
          cycle_type,
          start_date: weekStart.toISOString(),
          end_date: weekEnd.toISOString(),
          status: 'open',
        })
        .select()
        .single();

      if (createError) {
        return new Response(
          JSON.stringify({ error: 'Failed to create cycle', details: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      cycle = newCycle;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cycle is active',
        cycle_id: cycle.id,
        cycle_number: cycle.cycle_number,
        start_date: cycle.start_date,
        end_date: cycle.end_date,
        status: cycle.status,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MintCycle] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
