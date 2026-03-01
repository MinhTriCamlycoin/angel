import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine which month to finalize (default: previous month)
    let targetYear: number;
    let targetMonth: number; // 0-indexed
    try {
      const body = await req.json();
      if (body.year && body.month) {
        targetYear = body.year;
        targetMonth = body.month - 1; // Convert 1-indexed to 0-indexed
      } else {
        const now = new Date();
        targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      }
    } catch {
      const now = new Date();
      targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    }

    const periodLabel = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
    const periodStart = new Date(targetYear, targetMonth, 1).toISOString();
    const periodEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59).toISOString();

    // New month info
    const newMonth = targetMonth + 1 > 11 ? 0 : targetMonth + 1;
    const newYear = targetMonth + 1 > 11 ? targetYear + 1 : targetYear;
    const newPeriodLabel = `${newYear}-${String(newMonth + 1).padStart(2, '0')}`;
    const newStart = new Date(newYear, newMonth, 1).toISOString();
    const newEnd = new Date(newYear, newMonth + 1, 0, 23, 59, 59).toISOString();

    console.log(`[EpochReset] Finalizing period: ${periodLabel}, Opening: ${newPeriodLabel}`);

    // ========== STEP 1: Create mint_epoch record (draft) ==========
    const { data: epochRecord, error: epochInsertErr } = await supabase
      .from('mint_epochs')
      .upsert({
        epoch_label: periodLabel,
        period_start: periodStart,
        period_end: periodEnd,
        status: 'draft',
        rules_version: 'LS-Math-v1.0',
      }, { onConflict: 'epoch_label' })
      .select()
      .single();

    if (epochInsertErr) {
      console.error('[EpochReset] Error creating mint_epoch:', epochInsertErr);
    }
    const epochId = epochRecord?.id;

    // ========== STEP 2: Finalize light_score_ledger for previous month ==========
    const { data: monthlyData } = await supabase
      .from('features_user_day')
      .select('user_id, daily_light_score, consistency_multiplier, sequence_multiplier, integrity_penalty, reputation_weight')
      .gte('date', periodStart.split('T')[0])
      .lte('date', periodEnd.split('T')[0])
      .gt('daily_light_score', 0);

    let ledgerCount = 0;
    const userLightScores: Record<string, number> = {};

    if (monthlyData && monthlyData.length > 0) {
      const userScores: Record<string, { total: number; count: number; lastCM: number; lastSM: number; lastIP: number; lastRW: number }> = {};
      for (const row of monthlyData) {
        if (!userScores[row.user_id]) {
          userScores[row.user_id] = { total: 0, count: 0, lastCM: 1, lastSM: 1, lastIP: 1, lastRW: 1 };
        }
        userScores[row.user_id].total += row.daily_light_score || 0;
        userScores[row.user_id].count++;
        userScores[row.user_id].lastCM = row.consistency_multiplier || 1;
        userScores[row.user_id].lastSM = row.sequence_multiplier || 1;
        userScores[row.user_id].lastIP = row.integrity_penalty || 1;
        userScores[row.user_id].lastRW = row.reputation_weight || 1;
      }

      for (const userId of Object.keys(userScores)) {
        const us = userScores[userId];
        userLightScores[userId] = Math.round(us.total * 100) / 100;

        let level = 'seed';
        if (us.total >= 2000) level = 'architect';
        else if (us.total >= 1000) level = 'guardian';
        else if (us.total >= 500) level = 'builder';
        else if (us.total >= 200) level = 'contributor';

        let trend = 'stable';
        if (us.count >= 5 && us.total > 50) trend = 'growing';
        else if (us.total < 5) trend = 'reflecting';

        await supabase
          .from('light_score_ledger')
          .upsert({
            user_id: userId,
            period: periodLabel,
            period_start: periodStart,
            period_end: periodEnd,
            base_score: Math.round(us.total * 100) / 100,
            final_light_score: Math.round(us.total * 100) / 100,
            reputation_weight: us.lastRW,
            consistency_multiplier: us.lastCM,
            sequence_multiplier: us.lastSM,
            integrity_penalty: us.lastIP,
            level,
            trend,
            rule_version: 'LS-Math-v1.0',
            computed_at: new Date().toISOString(),
          }, { onConflict: 'user_id,period' });

        ledgerCount++;
      }
    }

    console.log(`[EpochReset] Finalized ledger for ${ledgerCount} users`);

    // ========== STEP 3: Write mint_allocations ==========
    if (epochId && Object.keys(userLightScores).length > 0) {
      const totalLight = Object.values(userLightScores).reduce((a, b) => a + b, 0);
      const allocations = Object.entries(userLightScores).map(([userId, score]) => ({
        epoch_id: epochId,
        user_id: userId,
        eligible: score >= 10,
        light_score: score,
        contribution_ratio: totalLight > 0 ? Math.round((score / totalLight) * 10000) / 10000 : 0,
        allocation_amount: 0, // Will be filled by pplp-epoch-allocate
        reason_codes: score >= 10 ? ['ELIGIBLE'] : ['BELOW_LMIN'],
      }));

      // Batch insert in chunks of 100
      for (let i = 0; i < allocations.length; i += 100) {
        const chunk = allocations.slice(i, i + 100);
        const { error: allocErr } = await supabase
          .from('mint_allocations')
          .upsert(chunk, { onConflict: 'epoch_id,user_id' });
        if (allocErr) console.error('[EpochReset] mint_allocations error:', allocErr);
      }

      // Update mint_epoch with totals
      await supabase
        .from('mint_epochs')
        .update({
          total_light: totalLight,
          user_count: Object.keys(userLightScores).length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', epochId);

      console.log(`[EpochReset] Wrote ${allocations.length} mint_allocations for epoch ${periodLabel}`);
    }

    // ========== STEP 4: Reset user_light_totals.total_points = 0 ==========
    const { error: resetError } = await supabase
      .from('user_light_totals')
      .update({ total_points: 0 })
      .neq('total_points', 0);

    if (resetError) {
      console.error('[EpochReset] Error resetting total_points:', resetError);
    } else {
      console.log('[EpochReset] Reset total_points to 0 for all users');
    }

    // ========== STEP 5: Trigger epoch allocation ==========
    try {
      const allocateResponse = await fetch(`${supabaseUrl}/functions/v1/pplp-epoch-allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ epoch_id: epochId }),
      });
      const allocateResult = await allocateResponse.json();
      console.log(`[EpochReset] Epoch allocation result:`, allocateResult);
    } catch (allocErr) {
      console.error('[EpochReset] Epoch allocation failed (continuing with reset):', allocErr);
    }

    // ========== STEP 6: Finalize mint_epoch ==========
    if (epochId) {
      await supabase
        .from('mint_epochs')
        .update({ status: 'finalized', finalized_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', epochId);
    }

    // Close any remaining open cycles
    await supabase
      .from('pplp_mint_cycles')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('status', 'open');

    // Get next cycle number
    const { data: lastCycle } = await supabase
      .from('pplp_mint_cycles')
      .select('cycle_number')
      .order('cycle_number', { ascending: false })
      .limit(1);

    const nextCycleNumber = (lastCycle && lastCycle.length > 0) ? lastCycle[0].cycle_number + 1 : 1;

    // Create new cycle
    const { error: cycleError } = await supabase
      .from('pplp_mint_cycles')
      .insert({
        cycle_number: nextCycleNumber,
        cycle_type: 'monthly',
        start_date: newStart,
        end_date: newEnd,
        status: 'open',
        total_mint_pool: 0,
        total_light_contribution: 0,
        max_share_per_user: 10000,
      });

    if (cycleError) {
      console.error('[EpochReset] Error creating mint cycle:', cycleError);
    } else {
      console.log(`[EpochReset] Created mint cycle #${nextCycleNumber} for ${newPeriodLabel}`);
    }

    return new Response(JSON.stringify({
      success: true,
      finalized_period: periodLabel,
      new_period: newPeriodLabel,
      ledger_users: ledgerCount,
      new_cycle_number: nextCycleNumber,
      epoch_id: epochId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EpochReset] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
