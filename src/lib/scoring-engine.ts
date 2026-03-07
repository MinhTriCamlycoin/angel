/**
 * PPLP Light Score Scoring Engine — LS-Math v1.0 + Dimension Scores v2.0
 * Pure functions for calculating Light Score components.
 * Used in both frontend simulation and backend edge functions.
 */

// ============================================================
// LS-Math v1.0 — Original scoring (kept intact)
// ============================================================

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

// ============================================================
// Dimension Scores v2.0 — 5 Pillar Web3 Reputation System
// ============================================================

export interface DimensionWeights {
  identity: number;
  activity: number;
  onchain: number;
  transparency: number;
  ecosystem: number;
}

export const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights = {
  identity: 0.20,
  activity: 0.20,
  onchain: 0.20,
  transparency: 0.20,
  ecosystem: 0.20,
};

export interface IdentityParams {
  hasDisplayName: boolean;
  hasAvatar: boolean;
  hasBio: boolean;
  hasHandle: boolean;
  emailVerified: boolean;
  walletLinked: boolean;
  accountAgeDays: number;
  hasDID: boolean;
}

/** Identity Score (max 100) */
export function computeIdentityScore(params: IdentityParams): number {
  let score = 0;
  if (params.hasDisplayName) score += 5;
  if (params.hasAvatar) score += 10;
  if (params.hasBio) score += 5;
  if (params.hasHandle) score += 10;
  if (params.emailVerified) score += 20;
  if (params.walletLinked) score += 30;
  if (params.accountAgeDays > 30) score += 10;
  if (params.hasDID) score += 10;
  return Math.min(100, score);
}

export interface OnChainParams {
  walletLinked: boolean;
  accountAgeDays: number;
  hasCompletedWithdrawals: boolean;
  hasWeb3Gifts: boolean;
}

/** On-Chain History Score (max 100) */
export function computeOnChainScore(params: OnChainParams): number {
  if (!params.walletLinked) return 0;
  let score = 20; // wallet linked
  if (params.accountAgeDays > 365) score += 30;
  else if (params.accountAgeDays > 180) score += 20;
  else if (params.accountAgeDays > 90) score += 10;
  if (params.hasCompletedWithdrawals) score += 20;
  if (params.hasWeb3Gifts) score += 30;
  return Math.min(100, score);
}

/** Wallet Transparency Score (max 100) — starts at 100, decreases with fraud signals */
export function computeTransparencyScore(unresolvedFraudCount: number): number {
  return Math.max(30, 100 - unresolvedFraudCount * 15);
}

export interface EcosystemParams {
  hasCamlyBalance: boolean;
  platformUsageDays: number;
  hasPostsOrComments: boolean;
  hasSentGifts: boolean;
  holdingOver30Days: boolean;
}

/** Ecosystem Alignment Score (max 100) */
export function computeEcosystemScore(params: EcosystemParams): number {
  let score = 0;
  if (params.hasCamlyBalance) score += 20;
  if (params.platformUsageDays > 7) score += 20;
  if (params.hasPostsOrComments) score += 20;
  if (params.hasSentGifts) score += 20;
  if (params.holdingOver30Days) score += 20;
  return Math.min(100, score);
}

/** Decay factor based on inactive days */
export function computeDecayFactor(inactiveDays: number): number {
  if (inactiveDays >= 180) return 0;
  if (inactiveDays >= 90) return 0.3;
  if (inactiveDays >= 60) return 0.6;
  if (inactiveDays >= 30) return 0.85;
  return 1.0;
}

/** Streak bonus percentage */
export function computeStreakBonus(streakDays: number): number {
  if (streakDays >= 90) return 0.10;
  if (streakDays >= 30) return 0.05;
  if (streakDays >= 7) return 0.02;
  return 0;
}

/** Risk penalty from fraud signals severity */
export function computeRiskPenalty(signals: Array<{ severity: number }>): number {
  const total = signals.reduce((sum, s) => {
    if (s.severity >= 4) return sum + 35;
    if (s.severity >= 3) return sum + 20;
    if (s.severity >= 2) return sum + 10;
    return sum + 5;
  }, 0);
  return Math.min(80, total);
}

export interface DimensionScores {
  identity: number;
  activity: number;
  onchain: number;
  transparency: number;
  ecosystem: number;
}

/** Total Light Score from 5 dimensions + streak - penalty */
export function computeTotalDimensionScore(
  dimensions: DimensionScores,
  streakBonus: number,
  riskPenalty: number,
): { total: number; level: string } {
  const raw = dimensions.identity + dimensions.activity + dimensions.onchain +
    dimensions.transparency + dimensions.ecosystem;
  const total = Math.max(0, raw * (1 + streakBonus) - riskPenalty);

  let level: string;
  if (total >= 800) level = "Cosmic Contributor";
  else if (total >= 500) level = "Light Leader";
  else if (total >= 250) level = "Light Guardian";
  else if (total >= 100) level = "Light Builder";
  else level = "Light Seed";

  return { total, level };
}

/** Level info for display */
export const LIGHT_LEVELS = [
  { name: "Light Seed", emoji: "🌱", min: 0, max: 99, color: "hsl(var(--muted-foreground))" },
  { name: "Light Builder", emoji: "🔨", min: 100, max: 249, color: "hsl(var(--primary))" },
  { name: "Light Guardian", emoji: "🛡️", min: 250, max: 499, color: "hsl(210, 80%, 55%)" },
  { name: "Light Leader", emoji: "⭐", min: 500, max: 799, color: "hsl(45, 90%, 50%)" },
  { name: "Cosmic Contributor", emoji: "🌟", min: 800, max: Infinity, color: "hsl(280, 70%, 60%)" },
] as const;

export function getLightLevelInfo(totalScore: number) {
  return LIGHT_LEVELS.find(l => totalScore >= l.min && totalScore <= l.max) ?? LIGHT_LEVELS[0];
}
