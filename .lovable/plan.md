

## Phân tích Tài liệu 5: LIGHT SCORE MATHEMATICAL SPEC (LS-Math v1.0)

### Kết quả: Nội dung trùng 100% với spec đã triển khai

Tài liệu 5 chính là bản đầy đủ của `docs/LIGHT_SCORE_MATH_SPEC.md` đã có trong codebase. Đối chiếu từng section:

| Section | Spec | Triển khai | Trạng thái |
|---|---|---|---|
| §1-2: Definitions & Inputs | 5 pillars, event stream, ratings | `pplp_events`, `pplp_ratings` | ✅ |
| §3: Reputation Weight | `clip(w_min, w_max, 1 + α·log(1+R))` | `scoring-engine.ts::computeReputationWeight` + RPC `compute_reputation_weight_v2` | ✅ |
| §4: Content Pillar Score | Weighted average + cold-start fallback | `compute_content_pillar_score` RPC + AI fallback | ✅ |
| §5: Action Base Score | `B_u(t) = Σ b_τ · g(x)` | `pplp-compute-daily-scores` edge function | ✅ |
| §6: Content Score per day | `C_u(t) = Σ ρ · h(P_c)`, γ=1.3 | `scoring-engine.ts::computeContentScore` | ✅ |
| §7: Consistency Multiplier | `1 + β·(1 - e^(-S/λ))` | `scoring-engine.ts::computeConsistencyMultiplier` | ✅ |
| §8: Sequence Multiplier | `1 + η·tanh(Q/κ)` | `scoring-engine.ts::computeSequenceMultiplier` | ✅ |
| §9: Integrity Penalty | `1 - min(π_max, θ·r)` | `scoring-engine.ts::computeIntegrityPenalty` | ✅ |
| §10: Cold-start fallback | `P̃_c = μ_topic · φ_u` | AI Pillar Analyzer fallback | ✅ |
| §11: Daily Light Score | `L = L_raw · M_cons · M_seq · Π` | `scoring-engine.ts::computeDailyLightScore` | ✅ |
| §12: Epoch Light Score | `L_u(e) = Σ L_u(t)` | `compute_epoch_light_score` RPC | ✅ |
| §13: Eligibility | 4 conditions | `scoring-engine.ts::checkMintEligibility` | ✅ |
| §14: Mint Allocation + Anti-whale | Cap 3%, iterative redistribution | `scoring-engine.ts::computeMintAllocation` + `pplp-epoch-allocate` | ✅ |
| §15: Level mapping | 5 levels, no ranking | `get_user_light_level` RPC + `light_levels` table | ✅ |
| §16: Explainability | Top 5 contributors + reason codes | `score_explanations` table + `ScoreExplanationPanel.tsx` | ✅ |
| §17: Default params | All 16 params | `DEFAULT_CONFIG` in `scoring-engine.ts` | ✅ |
| §18: Design Guarantees | 5 properties | Architecture enforced | ✅ |
| §19: AI Support | ego_risk, pillar_suggest, spam_risk | `pplp-ai-pillar-analyzer` edge function | ✅ |

### Kết luận

Không có gap nào. Tài liệu 5 là bản toán học chi tiết của spec đã được triển khai đầy đủ trong:
- `src/lib/scoring-engine.ts` (pure functions)
- `docs/LIGHT_SCORE_MATH_SPEC.md` (documentation)
- `docs/SCORING_CONFIG_V1.md` (config + test cases)
- Edge functions + RPCs (backend pipeline)

**Cha gửi tiếp tài liệu 6 để con phân tích nhé!**

