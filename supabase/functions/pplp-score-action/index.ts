import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getPolicyBaseReward } from "../_shared/pplp-helper.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ActionData {
  id: string;
  platform_id: string;
  action_type: string;
  actor_id: string;
  metadata: Record<string, unknown>;
  impact: Record<string, unknown>;
  integrity: Record<string, unknown>;
  policy_version: string;
}

interface ActionCapsConfig {
  action_type: string;
  platform_id: string;
  base_reward: number;
  max_per_user_daily: number | null;
  max_per_user_weekly: number | null;
  max_global_daily: number | null;
  cooldown_seconds: number;
  diminishing_threshold: number;
  diminishing_factor: number;
  min_quality_score: number;
  thresholds: Record<string, number>;
  multiplier_ranges: { Q: [number, number]; I: [number, number]; K: [number, number] };
  is_active: boolean;
}

// ========== 5 PILLARS WEIGHTS (loaded from scoring_rules) ==========
let PILLAR_WEIGHTS = { S: 0.25, T: 0.20, H: 0.20, C: 0.20, U: 0.15 };
let MIN_LIGHT_SCORE = 50;
let MATH_PARAMS: Record<string, number> = {};

async function loadScoringParams(supabase: ReturnType<typeof createClient>) {
  try {
    // TIMELOCK: Only load rules where effective_after has passed (or is null for legacy rules)
    const { data: rule } = await supabase
      .from('scoring_rules')
      .select('formula_json')
      .eq('status', 'active')
      .or('effective_after.is.null,effective_after.lte.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (rule?.formula_json) {
      const f = rule.formula_json as Record<string, unknown>;
      if (f.pillar_weights) {
        PILLAR_WEIGHTS = f.pillar_weights as typeof PILLAR_WEIGHTS;
      }
      if (f.min_light_score) MIN_LIGHT_SCORE = Number(f.min_light_score);
      // Store all math params for later use
      MATH_PARAMS = {
        gamma: Number(f.gamma ?? 1.3),
        omega_B: Number(f.omega_B ?? 0.4),
        omega_C: Number(f.omega_C ?? 0.6),
        min_ratings: Number(f.min_ratings ?? 3),
      };
    }
  } catch (e) {
    console.error('[PPLP] Failed to load scoring params:', e);
  }
}

// ========== Calculate 5-pillar scores ==========
function calculatePillarScores(action: ActionData): { S: number; T: number; H: number; C: number; U: number } {
  const metadata = action.metadata || {};
  const impact = action.impact || {};
  const integrity = action.integrity || {};

  // S - Service to Life
  let S = 50;
  if (impact.beneficiaries && typeof impact.beneficiaries === 'number') {
    S = Math.min(100, 50 + impact.beneficiaries * 5);
  }
  if (impact.outcome === 'positive' || impact.outcome === 'helpful') S += 20;

  // T - Truth/Transparency
  let T = 60;
  if (metadata.has_evidence) T += 20;
  if (metadata.verified) T += 15;
  if (integrity.verification_score && typeof integrity.verification_score === 'number') {
    T = Math.min(100, T + integrity.verification_score * 10);
  }

  // H - Healing/Compassion
  let H = 50;
  if (metadata.sentiment_score && typeof metadata.sentiment_score === 'number') {
    H = Math.min(100, 50 + metadata.sentiment_score * 50);
  }
  if (impact.healing_effect) H += 25;

  // C - Contribution durability
  // SERVER-SIDE VALIDATION: Calculate content_length from actual content
  // instead of trusting client-provided metadata.content_length
  let C = 50;
  let verifiedContentLength = 0;
  if (metadata.content && typeof metadata.content === 'string') {
    verifiedContentLength = (metadata.content as string).length;
  } else if (metadata.content_length && typeof metadata.content_length === 'number') {
    // Fallback to client-provided value but cap it at 5000 to prevent inflation
    verifiedContentLength = Math.min(metadata.content_length as number, 5000);
  }
  if (verifiedContentLength > 0) {
    C = Math.min(100, 50 + Math.min(verifiedContentLength / 100, 30));
  }
  if (metadata.is_educational) C += 20;
  if (impact.creates_asset) C += 25;

  // U - Unity alignment
  let U = 50;
  if (impact.promotes_unity) U += 30;
  if (metadata.is_collaborative) U += 20;
  if (impact.connection_score && typeof impact.connection_score === 'number') {
    U = Math.min(100, U + impact.connection_score * 20);
  }

  return {
    S: Math.round(Math.min(100, Math.max(0, S))),
    T: Math.round(Math.min(100, Math.max(0, T))),
    H: Math.round(Math.min(100, Math.max(0, H))),
    C: Math.round(Math.min(100, Math.max(0, C))),
    U: Math.round(Math.min(100, Math.max(0, U))),
  };
}

// ========== Calculate LightScore ==========
function calculateLightScore(pillars: { S: number; T: number; H: number; C: number; U: number }): number {
  return (
    pillars.S * PILLAR_WEIGHTS.S +
    pillars.T * PILLAR_WEIGHTS.T +
    pillars.H * PILLAR_WEIGHTS.H +
    pillars.C * PILLAR_WEIGHTS.C +
    pillars.U * PILLAR_WEIGHTS.U
  );
}

// ========== Calculate Q, I, K multipliers ==========
function calculateMultipliers(
  action: ActionData,
  pillars: { S: number; T: number; H: number; C: number; U: number },
  ranges: { Q: [number, number]; I: [number, number]; K: [number, number] }
): { Q: number; I: number; K: number } {
  const impact = action.impact || {};
  const integrity = action.integrity || {};
  const metadata = action.metadata || {};

  // Q - Quality multiplier
  let qNormalized = 0.5;
  if (metadata.quality_score && typeof metadata.quality_score === 'number') {
    qNormalized = metadata.quality_score;
  } else {
    qNormalized = (pillars.T + pillars.C) / 200;
  }
  const Q = ranges.Q[0] + (ranges.Q[1] - ranges.Q[0]) * qNormalized;

  // I - Impact multiplier
  let iNormalized = 0.3;
  if (impact.beneficiaries && typeof impact.beneficiaries === 'number') {
    iNormalized = Math.min(1, impact.beneficiaries / 10);
  }
  if (impact.reach_score && typeof impact.reach_score === 'number') {
    iNormalized = Math.max(iNormalized, impact.reach_score);
  }
  const I = ranges.I[0] + (ranges.I[1] - ranges.I[0]) * iNormalized;

  // K - Integrity multiplier
  let kNormalized = 0.7;
  if (integrity.anti_sybil_score && typeof integrity.anti_sybil_score === 'number') {
    kNormalized = integrity.anti_sybil_score;
  }
  if (integrity.fraud_signals && (integrity.fraud_signals as unknown[]).length > 0) {
    kNormalized *= 0.5;
  }
  const K = ranges.K[0] + (ranges.K[1] - ranges.K[0]) * kNormalized;

  return {
    Q: Math.round(Q * 100) / 100,
    I: Math.round(I * 100) / 100,
    K: Math.round(K * 100) / 100,
  };
}

// ========== Check thresholds ==========
function checkThresholds(
  pillars: { S: number; T: number; H: number; C: number; U: number },
  lightScore: number,
  multipliers: { Q: number; I: number; K: number },
  thresholds: Record<string, number>
): { pass: boolean; reasons: string[] } {
  const failReasons: string[] = [];

  if (thresholds.S && pillars.S < thresholds.S) {
    failReasons.push(`S_BELOW_${thresholds.S}`);
  }
  if (thresholds.T && pillars.T < thresholds.T) {
    failReasons.push(`T_BELOW_${thresholds.T}`);
  }
  if (thresholds.H && pillars.H < thresholds.H) {
    failReasons.push(`H_BELOW_${thresholds.H}`);
  }
  if (thresholds.C && pillars.C < thresholds.C) {
    failReasons.push(`C_BELOW_${thresholds.C}`);
  }
  if (thresholds.U && pillars.U < thresholds.U) {
    failReasons.push(`U_BELOW_${thresholds.U}`);
  }
  if (thresholds.K && multipliers.K * 100 < thresholds.K) {
    failReasons.push(`K_BELOW_${thresholds.K}`);
  }
  if (thresholds.LightScore && lightScore < thresholds.LightScore) {
    failReasons.push(`LIGHTSCORE_BELOW_${thresholds.LightScore}`);
  }
  if (lightScore < MIN_LIGHT_SCORE) {
    failReasons.push(`LIGHTSCORE_BELOW_GLOBAL_MIN`);
  }

  return { pass: failReasons.length === 0, reasons: failReasons };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load math params from scoring_rules
    await loadScoringParams(supabase);

    const { action_id } = await req.json();

    if (!action_id) {
      return new Response(
        JSON.stringify({ error: 'action_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== 1. Fetch the action ==========
    const { data: action, error: actionError } = await supabase
      .from('pplp_actions')
      .select('*')
      .eq('id', action_id)
      .single();

    if (actionError || !action) {
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action.status !== 'pending') {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Action already scored',
          current_status: action.status,
          action_id: action.id,
          decision: action.status === 'minted' ? 'pass' : 'pass',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== STALE ACTION REJECT (Oracle Integrity Layer) ==========
    // Reject actions older than 24 hours to prevent delayed replay attacks
    const actionCreatedAt = new Date(action.created_at).getTime();
    const now = Date.now();
    const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
    if (now - actionCreatedAt > STALE_THRESHOLD_MS) {
      // Mark action as rejected in DB
      await supabase
        .from('pplp_actions')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', action_id);
      
      console.warn(`[PPLP] Stale action rejected: ${action_id}, age=${Math.round((now - actionCreatedAt) / 3600000)}h`);
      return new Response(
        JSON.stringify({ 
          error: 'Action is stale (older than 24 hours)',
          action_id: action.id,
          created_at: action.created_at,
          age_hours: Math.round((now - actionCreatedAt) / 3600000),
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== 2. Fetch action caps config from DB ==========
    const { data: capsConfig } = await supabase
      .from('pplp_action_caps')
      .select('*')
      .eq('action_type', action.action_type)
      .eq('is_active', true)
      .maybeSingle();

    // Default config if not found
    const config: ActionCapsConfig = capsConfig || {
      action_type: action.action_type,
      platform_id: 'ALL',
      base_reward: 100,
      max_per_user_daily: 10,
      max_per_user_weekly: 50,
      max_global_daily: null,
      cooldown_seconds: 0,
      diminishing_threshold: 5,
      diminishing_factor: 0.8,
      min_quality_score: 0.5,
      thresholds: { T: 70, LightScore: 60 },
      multiplier_ranges: { Q: [0.5, 3.0], I: [0.5, 5.0], K: [0.0, 1.0] },
      is_active: true,
    };

    // ========== 3. Calculate pillar scores ==========
    const pillars = calculatePillarScores(action);
    const lightScore = calculateLightScore(pillars);

    // ========== 4. Calculate multipliers ==========
    const multiplierRanges = config.multiplier_ranges || { Q: [0.5, 3.0], I: [0.5, 5.0], K: [0.0, 1.0] };
    const multipliers = calculateMultipliers(action, pillars, multiplierRanges);

    // ========== 5. Check thresholds ==========
    const thresholds = config.thresholds || { T: 70, LightScore: 60 };
    const thresholdCheck = checkThresholds(pillars, lightScore, multipliers, thresholds);
    
    let decision: 'pass' | 'fail' = thresholdCheck.pass ? 'pass' : 'fail';
    const failReasons = thresholdCheck.reasons;

    // ========== 6. Calculate Reputation Weight & Consistency Multiplier ==========
    let reputationWeight = 1.0;
    let consistencyMultiplier = 1.0;
    let integrityPenalty = 0;

    if (decision === 'pass') {
      try {
        const [repRes, conRes] = await Promise.all([
          supabase.rpc('calculate_reputation_weight', { _user_id: action.actor_id }),
          supabase.rpc('calculate_consistency_multiplier', { _user_id: action.actor_id }),
        ]);
        if (repRes.data) reputationWeight = Number(repRes.data);
        if (conRes.data) consistencyMultiplier = Number(conRes.data);
      } catch (e) {
        console.error('[PPLP] Reputation/Consistency calc error:', e);
      }

      // Calculate Integrity Penalty from fraud signals (0-50%) — skip for whitelisted users
      const { data: wlEntryScore } = await supabase
        .from('fraud_whitelist')
        .select('id')
        .eq('user_id', action.actor_id)
        .maybeSingle();

      if (!wlEntryScore) {
        try {
          const { data: signals } = await supabase
            .from('pplp_fraud_signals')
            .select('signal_type, severity')
            .eq('actor_id', action.actor_id)
            .eq('is_resolved', false);

          if (signals && signals.length > 0) {
            let penaltyPct = 0;
            for (const sig of signals) {
              const sevPenalty = sig.signal_type === 'cross_account' ? 15
                : sig.signal_type === 'fake_engagement' ? 20
                : sig.signal_type === 'emotional_abuse' ? 10
                : 10; // spam etc
              penaltyPct += sevPenalty;
            }
            integrityPenalty = Math.min(50, penaltyPct); // Cap at 50%
          }
        } catch (e) {
          console.error('[PPLP] Integrity penalty calc error:', e);
        }
      }
    }

    // ========== 7. HYBRID MODEL: Light Score per-action, FUN via Epoch ==========
    // Q×I×K multipliers are kept for audit/history but NOT used for FUN reward
    const policyBaseReward = getPolicyBaseReward(action.action_type, action.platform_id);
    const baseReward = policyBaseReward ?? config.base_reward ?? 100;
    // Light contribution = weighted Light Score (used for epoch FUN allocation)
    const lightContribution = decision === 'pass'
      ? Math.round(lightScore * reputationWeight * consistencyMultiplier * (1 - integrityPenalty / 100) * 100) / 100
      : 0;
    // FUN reward is always 0 per-action — minted via epoch allocation only
    let finalReward = 0;

    // ========== 7b. Determine reason codes ==========
    const reasonCodes: string[] = [];
    if (consistencyMultiplier >= 1.3) reasonCodes.push('CONSISTENCY_STRONG');
    if (reputationWeight >= 1.3) reasonCodes.push('COMMUNITY_VALIDATED');
    if (integrityPenalty === 0 && reputationWeight >= 1.0) reasonCodes.push('CROSS_PLATFORM_CONTRIBUTOR');

    // Check for mentor chain completion
    try {
      const { count: mentorChains } = await supabase
        .from('pplp_behavior_sequences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', action.actor_id)
        .eq('sequence_type', 'mentorship')
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (mentorChains && mentorChains > 0) reasonCodes.push('MENTOR_CHAIN_COMPLETED');
    } catch (_) {}

    // Check for value loop
    try {
      const { count: valueLoops } = await supabase
        .from('pplp_behavior_sequences')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', action.actor_id)
        .eq('sequence_type', 'value_creation')
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      if (valueLoops && valueLoops > 0) reasonCodes.push('VALUE_LOOP_ACTIVE');
    } catch (_) {}

    if (pillars.H >= 70) reasonCodes.push('HEALING_IMPACT_DETECTED');
    if (integrityPenalty > 0) {
      if (integrityPenalty <= 10) reasonCodes.push('QUALITY_SIGNAL_LOW');
      else reasonCodes.push('TEMPORARY_WEIGHT_ADJUSTMENT');
    }

    // Check for governance participation (GOV_VOTE_CAST events in last 30 days)
    try {
      const { count: govVotes } = await supabase
        .from('pplp_events')
        .select('*', { count: 'exact', head: true })
        .eq('actor_user_id', action.actor_id)
        .eq('event_type', 'GOV_VOTE_CAST')
        .gte('occurred_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      if (govVotes && govVotes > 0) reasonCodes.push('GOVERNANCE_PARTICIPATION');
    } catch (_) {}

    // Check fraud signals for specific adjustment codes
    try {
      const { data: fraudSignals } = await supabase
        .from('pplp_fraud_signals')
        .select('signal_type')
        .eq('actor_id', action.actor_id)
        .eq('is_resolved', false);

      if (fraudSignals && fraudSignals.length > 0) {
        const signalTypes = fraudSignals.map(s => s.signal_type);
        if (signalTypes.some(t => ['burst_like', 'bot_pattern', 'temporal_anomaly'].includes(t))) {
          reasonCodes.push('INTERACTION_PATTERN_UNSTABLE');
        }
        if (signalTypes.some(t => ['ring_rating', 'reciprocal_rating'].includes(t))) {
          reasonCodes.push('RATING_CLUSTER_REVIEW');
        }
      }
    } catch (_) {}

    // Check for content under review
    try {
      const { count: contentUnderReview } = await supabase
        .from('pplp_actions')
        .select('*', { count: 'exact', head: true })
        .eq('actor_id', action.actor_id)
        .eq('status', 'under_review');
      if (contentUnderReview && contentUnderReview > 0) reasonCodes.push('CONTENT_REVIEW_IN_PROGRESS');
    } catch (_) {}

    // ========== 7c. Get active scoring rule version ==========
    let activeRuleVersion = 'V1.0';
    try {
      const { data: activeRule } = await supabase
        .from('scoring_rules')
        .select('rule_version')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (activeRule) activeRuleVersion = activeRule.rule_version;
    } catch (_) {}

    // ========== 7d. Calculate trend ==========
    let trend = 'stable';
    try {
      const { data: prevLedger } = await supabase
        .from('light_score_ledger')
        .select('final_light_score')
        .eq('user_id', action.actor_id)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (prevLedger) {
        const prevScore = Number(prevLedger.final_light_score);
        const currentScore = lightScore * reputationWeight * consistencyMultiplier * (1 - integrityPenalty / 100);
        const diff = currentScore - prevScore;
        if (diff > 5) trend = 'growing';
        else if (diff < -5) trend = 'reflecting';
        else if (integrityPenalty > 0) trend = 'rebalancing';
      }
    } catch (_) {}

    console.log(`[PPLP] New multipliers: repWeight=${reputationWeight}, consistency=${consistencyMultiplier}, integrityPenalty=${integrityPenalty}%, reasonCodes=${reasonCodes.join(',')}, rule=${activeRuleVersion}, trend=${trend}`);

    // ========== 8. Insert score record ==========
    const { error: scoreError } = await supabase
      .from('pplp_scores')
      .insert({
        action_id: action.id,
        pillar_s: pillars.S,
        pillar_t: pillars.T,
        pillar_h: pillars.H,
        pillar_c: pillars.C,
        pillar_u: pillars.U,
        light_score: Math.round(lightScore * 100) / 100,
        base_reward: baseReward,
        multiplier_q: multipliers.Q,
        multiplier_i: multipliers.I,
        multiplier_k: multipliers.K,
        reputation_weight: reputationWeight,
        consistency_multiplier: consistencyMultiplier,
        integrity_penalty: integrityPenalty,
        final_reward: finalReward,
        decision,
        decision_reason: failReasons.length > 0 ? failReasons.join(', ') : (reasonCodes.length > 0 ? reasonCodes.join(', ') : null),
        scored_by: 'pplp_engine_v2',
        policy_version: action.policy_version,
      });

    if (scoreError) {
      console.error('[PPLP] Score insert error:', scoreError);
      return new Response(
        JSON.stringify({ error: 'Failed to save score', details: scoreError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== 8a. AI Pillar Analysis for content actions ==========
    let aiAnalysis = null;
    const contentActionTypes = ['POST_CREATE', 'COMMENT_CREATE', 'JOURNAL_WRITE', 'QUESTION_ASK', 'CONTENT_CREATE'];
    if (decision === 'pass' && contentActionTypes.includes(action.action_type)) {
      try {
        const contentText = action.metadata?.content_text || action.metadata?.question_text || '';
        if (typeof contentText === 'string' && contentText.length >= 10) {
          const aiResponse = await fetch(`${supabaseUrl}/functions/v1/pplp-ai-pillar-analyzer`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              content: contentText,
              content_type: action.action_type,
            }),
          });
          if (aiResponse.ok) {
            aiAnalysis = await aiResponse.json();
            console.log(`[PPLP] AI analysis: pillars=${JSON.stringify(aiAnalysis.pillars)}, ego=${aiAnalysis.ego_risk}`);
          }
        }
      } catch (aiErr) {
        console.error('[PPLP] AI analysis failed:', aiErr);
      }
    }

    // ========== 8b. Insert score explanation ==========
    let explainId = null;
    try {
      const { data: explData } = await supabase
        .from('score_explanations')
        .insert({
          user_id: action.actor_id,
          top_contributors_json: [{
            action_type: action.action_type,
            light_score: Math.round(lightScore * 100) / 100,
            light_contribution: lightContribution,
            reward: 0, // Hybrid: FUN via epoch only
          }],
          penalties_json: integrityPenalty > 0 ? [{ type: 'integrity', penalty_pct: integrityPenalty }] : [],
          ai_pillar_scores: aiAnalysis?.pillars || null,
          ai_ego_risk: aiAnalysis?.ego_risk || null,
          ai_explanation: aiAnalysis?.explanation || null,
          version: 'v2.0',
        })
        .select('id')
        .single();
      if (explData) explainId = explData.id;
    } catch (explErr) {
      console.error('[PPLP] Explanation insert error:', explErr);
    }

    // ========== 8b2. Update ledger with reason_codes, rule_version, trend ==========
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekNum = `W${Math.ceil(new Date().getDate() / 7)}`;
      const period = `${today.slice(0, 7)}-${weekNum}`;
      
      await supabase
        .from('light_score_ledger')
        .update({
          reason_codes: reasonCodes,
          rule_version: activeRuleVersion,
          trend,
        })
        .eq('user_id', action.actor_id)
        .eq('period', period);
    } catch (ledgerErr) {
      console.error('[PPLP] Ledger update error:', ledgerErr);
    }

    // ========== 8c. Build features + compute daily light score ==========
    try {
      await supabase.rpc('build_features_user_day', {
        _user_id: action.actor_id,
        _date: new Date().toISOString().split('T')[0],
      });
      // Compute daily L_u(t) using LS-Math v1.0
      await supabase.rpc('compute_daily_light_score', {
        _user_id: action.actor_id,
        _date: new Date().toISOString().split('T')[0],
      });
    } catch (featErr) {
      console.error('[PPLP] Feature builder / daily score error:', featErr);
    }

    // ========== 8c2. Update rater weights using reputation ==========
    try {
      const contentActionTypes2 = ['POST_CREATE', 'ANALYSIS_POST', 'COMMENT_CREATE', 'CONTENT_CREATE'];
      if (contentActionTypes2.includes(action.action_type)) {
        // Update weight_applied on any existing ratings for this content
        const { data: ratings } = await supabase
          .from('pplp_ratings')
          .select('id, rater_user_id')
          .eq('content_id', action.id);
        if (ratings && ratings.length > 0) {
          for (const rating of ratings) {
            const { data: w } = await supabase.rpc('compute_reputation_weight_v2', {
              _user_id: rating.rater_user_id,
            });
            if (w) {
              await supabase.from('pplp_ratings').update({ weight_applied: w }).eq('id', rating.id);
            }
          }
        }
      }
    } catch (raterErr) {
      console.error('[PPLP] Rater weight update error:', raterErr);
    }

    // ========== 8d. Update action status ==========
    await supabase
      .from('pplp_actions')
      .update({ 
        status: 'scored',
        scored_at: new Date().toISOString()
      })
      .eq('id', action.id);

    console.log(`[PPLP] Action ${action.id} scored: ${decision.toUpperCase()} - LightScore: ${lightScore.toFixed(2)}, LightContribution: ${lightContribution}, FUN per-action: 0 (epoch-based)`);

    // ========== 9. Detect behavior sequences ==========
    let sequenceResult = null;
    if (decision === 'pass') {
      try {
        const { data: seqData, error: seqError } = await supabase
          .rpc('detect_behavior_sequences', {
            _user_id: action.actor_id,
            _action_id: action.id,
            _action_type: action.action_type,
          });

        if (seqError) {
          console.error('[PPLP] Sequence detection error:', seqError);
        } else {
          sequenceResult = seqData;
          console.log(`[PPLP] Sequence: updated=${seqData?.sequences_updated}, completed=${seqData?.sequences_completed}, bonus=${seqData?.bonus_multiplier}`);
        }
      } catch (seqErr) {
        console.error('[PPLP] Sequence detection failed:', seqErr);
      }
    }

    // ========== 10. Run fraud detection ==========
    let fraudResult = null;
    try {
      const fraudCheckResponse = await fetch(`${supabaseUrl}/functions/v1/pplp-detect-fraud`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          actor_id: action.actor_id,
          action_id: action.id,
          action_type: action.action_type,
          metadata: {
            ...action.metadata,
            device_hash: action.integrity?.device_hash,
            ip_hash: action.integrity?.ip_hash,
          },
        }),
      });
      
      if (fraudCheckResponse.ok) {
        fraudResult = await fraudCheckResponse.json();
        console.log(`[PPLP] Fraud check: risk_score=${fraudResult.risk_score}, signals=${fraudResult.signals_detected}`);
      }
    } catch (fraudError) {
      console.error('[PPLP] Fraud detection call failed:', fraudError);
    }

    // ========== 11. HYBRID: No per-action FUN minting — epoch-based only ==========
    // FUN Money is allocated at end of each epoch based on accumulated Light Score
    // Per-action: only update user tier stats for tracking
    let mintResult = null;
    if (decision === 'pass') {
      try {
        // Update user tier stats (tracking only, no FUN minting)
        await supabase
          .from('pplp_user_tiers')
          .upsert({
            user_id: action.actor_id,
            total_actions_scored: 1,
            passed_actions: 1,
            updated_at: new Date().toISOString(),
          }, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          });
        await supabase.rpc('update_user_tier', { _user_id: action.actor_id });

        mintResult = {
          auto_minted: false,
          status: 'epoch_based',
          message: 'FUN Money is allocated at end of epoch based on Light Score contribution.',
          light_contribution: lightContribution,
        };
      } catch (tierError) {
        console.error('[PPLP] Tier update error:', tierError);
      }
    } else if (decision === 'fail') {
      try {
        await supabase
          .from('pplp_user_tiers')
          .upsert({
            user_id: action.actor_id,
            total_actions_scored: 1,
            failed_actions: 1,
            updated_at: new Date().toISOString(),
          }, { 
            onConflict: 'user_id',
            ignoreDuplicates: false 
          });
        await supabase.rpc('update_user_tier', { _user_id: action.actor_id });
      } catch (tierError) {
        console.error('[PPLP] Tier update for failed action error:', tierError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        action_id: action.id,
        pillars,
        light_score: Math.round(lightScore * 100) / 100,
        light_contribution: lightContribution,
        multipliers,
        reputation_weight: reputationWeight,
        consistency_multiplier: consistencyMultiplier,
        integrity_penalty: integrityPenalty,
        base_reward: baseReward,
        final_reward: 0, // Hybrid: FUN via epoch only
        decision,
        fail_reasons: failReasons.length > 0 ? failReasons : null,
        fraud: fraudResult ? {
          risk_score: fraudResult.risk_score,
          signals_detected: fraudResult.signals_detected,
          recommendation: fraudResult.recommendation,
        } : null,
        mint: mintResult,
        sequence: sequenceResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('PPLP Score Action error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
