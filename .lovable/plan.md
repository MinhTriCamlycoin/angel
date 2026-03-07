

# Phân tích & Kế hoạch nâng cấp Light Score 5 Trụ Cột

## Tóm tắt 2 tài liệu

### Tài liệu 1: HỆ THỐNG LIGHT SCORE
Định nghĩa 5 trụ cột mới: **Identity Score**, **Activity Score**, **On-Chain History Score**, **Wallet Transparency Score**, **Ecosystem Alignment Score**. Kèm cơ chế chống gian lận (Anti-Bot, Spam, Airdrop Farmer, Wallet Cluster, Reputation Decay) và 5 cấp độ (Light Seed → Cosmic Contributor).

### Tài liệu 2: LIGHT SCORE WHITEPAPER v1
Mở rộng chi tiết hơn với:
- **Công thức**: `Light Score = w1×Identity + w2×Activity + w3×OnChain + w4×Transparency + w5×Ecosystem - Risk Penalty`
- **Trọng số ban đầu**: Mỗi trụ 20% (có thể điều chỉnh sau)
- **Thang điểm**: Mỗi trụ 0-100, tổng tối đa 500
- **Risk Penalty**: 3 mức (nhẹ 5-15, trung bình 15-35, mạnh 35-80)
- **Time Decay**: 30d → giảm nhẹ, 60d → giảm thêm, 90d → giảm cấp, 180d → trạng thái ngủ
- **Streak Bonus**: 7d +2%, 30d +5%, 90d +10%
- **6 lớp kiến trúc Angel AI**: Data Collection → Verification → Scoring → Fraud Detection → Reward → Reputation
- **3 Reward Pools**: Community Gift, Strategic Growth, FUN Money Mint
- **Reputation NFT**: Dynamic, soulbound-friendly, multi-layer metadata
- **Cấp độ mới**: 0-99 Seed, 100-249 Builder, 250-499 Guardian, 500-799 Leader, 800+ Cosmic
- **3 Phase**: Core → NFT → Digital Identity Bank
- **Khóa thuật ngữ**: PPLP = Luật, Proof of Pure Contribution = nguyên tắc, Light Score = hệ thống chấm điểm, Reputation NFT = chứng nhận, D.I.B. = ngân hàng danh tính, Angel AI = bộ máy vận hành

---

## Đánh giá hiện trạng hệ thống

### Đã có (hoạt động tốt)
- LS-Math v1.0 scoring engine (Action + Content × multipliers)
- PPLP 5 pillars cho community rating nội dung
- Anti-fraud 10 lớp, Sybil detection
- Behavior Sequence Engine (5 chuỗi hành vi)
- Light Levels (5 cấp) trong bảng `pplp_light_levels`
- `light_score_ledger`, `features_user_day`, `pplp_fraud_signals`

### Chưa có (cần bổ sung theo Whitepaper)
| Tính năng | Trạng thái |
|-----------|-----------|
| Bảng `user_dimension_scores` (5 trụ cột) | ❌ Chưa tạo |
| Identity Score computation | ❌ Chỉ có profile completeness đơn giản |
| On-Chain History Score | ❌ Có `useOnChainTransactions` nhưng chưa chấm điểm |
| Wallet Transparency Score | ❌ Chưa có |
| Ecosystem Alignment Score | ❌ Chưa có |
| Reputation Decay (30/60/90/180 ngày) | ❌ Chưa có |
| Streak Bonus theo whitepaper (2%/5%/10%) | ⚠️ Có consistency multiplier nhưng công thức khác |
| Risk Penalty 3 mức | ⚠️ Có integrity penalty nhưng cần mapping lại |
| UI hiển thị 5 trụ cột | ❌ Trang hiện tại chỉ hiện tổng + lịch sử |
| Scoring engine 5 dimension functions | ❌ Chưa có |

### Khác biệt cần hòa hợp

**Cấp độ**: Whitepaper đề xuất thang 0-800+ (5 cấp), hệ thống hiện tại dùng thang khác trong `pplp_light_levels`. Cần cập nhật cho khớp.

**Trọng số**: Whitepaper dùng 5×20% cho dimension scores. LS-Math v1.0 dùng `ω_B=0.4, ω_C=0.6`. → Activity dimension sẽ **tái sử dụng** kết quả LS-Math hiện tại, normalize về 0-100.

---

## Kế hoạch triển khai (Phase 1 — Light Score Core)

### 1. Database Migration
Tạo bảng `user_dimension_scores`:
- `user_id`, `identity_score` (0-100), `activity_score` (0-100), `onchain_score` (0-100), `transparency_score` (0-100), `ecosystem_score` (0-100)
- `risk_penalty`, `streak_bonus_pct`, `total_light_score`, `level_name`
- `inactive_days`, `decay_applied`, `computed_at`

Tạo function `compute_user_dimensions(_user_id)`:
- **Identity** (max 100): profile fields filled (10), email verified (20), avatar (10), wallet linked (30), account age >30d (10), bio exists (5), display_name (5), phone (10)
- **Activity** (max 100): Normalize tổng `final_light_score` từ `light_score_ledger` (30 ngày gần nhất) về 0-100
- **OnChain** (max 100): wallet linked (20), has transactions (20), wallet age >1yr (30), smart contract interactions (30) — từ `user_wallet_addresses`
- **Transparency** (max 100): Start 100, trừ theo `pplp_fraud_signals` unresolved (-15/signal, max -70)
- **Ecosystem** (max 100): Camly balance >0 (20), platform usage >7d (20), posts/comments (20), donations (20), holding >30d (20)
- **Risk Penalty**: sum severity từ fraud signals (nhẹ 5-15, trung bình 15-35, mạnh 35-80)
- **Decay**: 30d inactive → Activity×0.85, 60d → ×0.6, 90d → ×0.3, 180d → ×0
- **Streak**: 7d +2%, 30d +5%, 90d +10%

Cập nhật `pplp_light_levels` cho khớp whitepaper:
- Seed 0-99, Builder 100-249, Guardian 250-499, Leader 500-799, Cosmic 800+

### 2. Scoring Engine (`src/lib/scoring-engine.ts`)
Thêm functions:
- `computeIdentityScore(params)` 
- `computeOnChainScore(params)`
- `computeTransparencyScore(fraudSignals)`
- `computeEcosystemScore(params)`
- `computeDecayFactor(inactiveDays)`
- `computeStreakBonus(streakDays)`
- `computeTotalDimensionScore(dimensions, weights, riskPenalty, streakBonus)`

### 3. Edge Function — `pplp-compute-dimensions`
Daily cron job gọi `compute_user_dimensions` cho tất cả users active trong 180 ngày.

### 4. Hook — `src/hooks/useDimensionScores.ts`
Fetch từ `user_dimension_scores` cho user hiện tại.

### 5. Frontend — Nâng cấp `UnifiedLightScore.tsx`
- 5 cards hiển thị từng dimension (icon + điểm + progress bar 0-100)
- Tổng Light Score + Level badge
- Radar/bar chart 5 chiều (dùng Recharts đã có)
- Risk Penalty indicator
- Streak & Decay status
- Giữ nguyên bảng lịch sử hiện tại

### 6. Docs — Cập nhật `docs/LIGHT_SCORE_MATH_SPEC.md`
Thêm section 5 Dimension Scores, trọng số, decay, streak bonus.

---

## Tổng kết thay đổi

| # | Resource | Thay đổi |
|---|----------|----------|
| 1 | DB Migration | Tạo `user_dimension_scores` + function `compute_user_dimensions` + update `pplp_light_levels` |
| 2 | `src/lib/scoring-engine.ts` | Thêm 6 dimension functions |
| 3 | `supabase/functions/pplp-compute-dimensions/index.ts` | Edge function mới (cron daily) |
| 4 | `src/hooks/useDimensionScores.ts` | Hook mới |
| 5 | `src/pages/UnifiedLightScore.tsx` | UI 5 trụ cột + chart + level |
| 6 | `docs/LIGHT_SCORE_MATH_SPEC.md` | Cập nhật spec |

**Không thay đổi**: PPLP scoring hiện tại, anti-fraud, mint engine, behavior sequences — tất cả giữ nguyên và được tái sử dụng làm data source cho Activity dimension.

