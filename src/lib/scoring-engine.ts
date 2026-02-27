/**
 * PPLP Light Score Scoring Engine — LS-Math v1.0
 * Pure functions for calculating Light Score components.
 * Used in both frontend simulation and backend edge functions.
 */

export interface ScoringConfig {
  weights: { base_action_weight: number; content_weight: number };
  reputation: { alpha: number; w_min: number; w_max: number };
  content: { gamma: number; type_multiplier: Record<string, number> };
  consistency: { beta: number; lambda: number };
  sequence: { eta: number; kappa: number };
  penalty: { theta: number; max_penalty: number };
  mint: { epoch_type: string; anti_whale_cap: number; min_light_threshold: number };
}

export const DEFAULT_CONFIG: ScoringConfig = {
  weights: { base_action_weight: 0.4, content_weight: 0.6 },
  reputation: { alpha: 0.25, w_min: 0.5, w_max: 2.0 },
  content: {
    gamma: 1.3,
    type_multiplier: {
      post: 1.0, comment: 0.6, video: 1.2, course: 1.5,
      bug_report: 1.1, proposal: 1.3,
    },
  },
  consistency: { beta: 0.6, lambda: 30 },
  sequence: { eta: 0.5, kappa: 5 },
  penalty: { theta: 0.8, max_penalty: 0.5 },
  mint: { epoch_type: "monthly", anti_whale_cap: 0.03, min_light_threshold: 10 },
};

/** Clip value between min and max */
export function clip(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

/** §3 — Reputation Weight */
export function computeReputationWeight(
  contributionDays: number,
  passRate: number,
  streakBonus: number,
  config = DEFAULT_CONFIG,
): number {
  const R = contributionDays * passRate * (1 + streakBonus);
  return clip(
    config.reputation.w_min,
    config.reputation.w_max,
    1 + config.reputation.alpha * Math.log(1 + R),
  );
}

/** §4 — Content quality normalization h(P_c) */
export function normalizeContentScore(pillarSum: number, config = DEFAULT_CONFIG): number {
  return Math.pow(pillarSum / 10, config.content.gamma);
}

/** §6 — Content Score for a day (sum of ρ × h(P_c) for each content) */
export function computeContentScore(
  contents: Array<{ pillarSum: number; type: string }>,
  config = DEFAULT_CONFIG,
): number {
  return contents.reduce((sum, c) => {
    const rho = config.content.type_multiplier[c.type] ?? 1.0;
    return sum + rho * normalizeContentScore(c.pillarSum, config);
  }, 0);
}

/** §7 — Consistency Multiplier */
export function computeConsistencyMultiplier(streak: number, config = DEFAULT_CONFIG): number {
  return 1 + config.consistency.beta * (1 - Math.exp(-streak / config.consistency.lambda));
}

/** §8 — Sequence Multiplier */
export function computeSequenceMultiplier(sequenceBonus: number, config = DEFAULT_CONFIG): number {
  return 1 + config.sequence.eta * Math.tanh(sequenceBonus / config.sequence.kappa);
}

/** §9 — Integrity Penalty */
export function computeIntegrityPenalty(avgRisk: number, config = DEFAULT_CONFIG): number {
  return 1 - Math.min(config.penalty.max_penalty, config.penalty.theta * avgRisk);
}

/** §11 — Daily Light Score (raw + multipliers) */
export function computeDailyLightScore(params: {
  baseActionScore: number;
  contentScore: number;
  streak: number;
  sequenceBonus: number;
  avgRisk: number;
  config?: ScoringConfig;
}): {
  raw: number;
  consistencyMul: number;
  sequenceMul: number;
  integrityPen: number;
  final: number;
} {
  const cfg = params.config ?? DEFAULT_CONFIG;
  const raw =
    cfg.weights.base_action_weight * params.baseActionScore +
    cfg.weights.content_weight * params.contentScore;

  const consistencyMul = computeConsistencyMultiplier(params.streak, cfg);
  const sequenceMul = computeSequenceMultiplier(params.sequenceBonus, cfg);
  const integrityPen = computeIntegrityPenalty(params.avgRisk, cfg);

  const final = raw * consistencyMul * sequenceMul * integrityPen;

  return { raw, consistencyMul, sequenceMul, integrityPen, final };
}

/** §14 — Mint Allocation with Anti-Whale cap */
export function computeMintAllocation(params: {
  userLight: number;
  totalSystemLight: number;
  mintPool: number;
  config?: ScoringConfig;
}): { share: number; allocation: number; capped: boolean } {
  const cfg = params.config ?? DEFAULT_CONFIG;
  if (params.totalSystemLight <= 0) return { share: 0, allocation: 0, capped: false };

  const rawShare = params.userLight / params.totalSystemLight;
  const capped = rawShare > cfg.mint.anti_whale_cap;
  const share = capped ? cfg.mint.anti_whale_cap : rawShare;
  const allocation = Math.floor(params.mintPool * share);

  return { share, allocation, capped };
}

/** §13 — Eligibility check */
export function checkMintEligibility(params: {
  pplpAccepted: boolean;
  avgRisk: number;
  epochLightScore: number;
  hasUnresolvedReview: boolean;
  config?: ScoringConfig;
}): { eligible: boolean; reason?: string } {
  const cfg = params.config ?? DEFAULT_CONFIG;

  if (!params.pplpAccepted) return { eligible: false, reason: "PPLP_NOT_ACCEPTED" };
  if (params.avgRisk > 0.7) return { eligible: false, reason: "HIGH_RISK" };
  if (params.epochLightScore < cfg.mint.min_light_threshold)
    return { eligible: false, reason: "LOW_LIGHT_SCORE" };
  if (params.hasUnresolvedReview) return { eligible: false, reason: "UNRESOLVED_REVIEW" };

  return { eligible: true };
}
