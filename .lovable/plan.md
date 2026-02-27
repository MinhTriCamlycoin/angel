

# Thống kê toàn bộ thay đổi Angel AI sau 6 tài liệu update gần nhất

Dưới đây là bảng tổng hợp **tất cả thay đổi** đã được triển khai, phân theo từng tài liệu nguồn.

---

## TÀI LIỆU 1: `FUN_CORE_ARCHITECTURE.md` — Kiến trúc lõi 7 lớp

### Database (5 bảng mới)
| Bảng | Mục đích |
|------|----------|
| `user_dids` | Định danh phi tập trung (DID Engine) |
| `soulbound_nfts` | NFT Soulbound không chuyển nhượng |
| `identity_metadata` | Lưu trữ dữ liệu mã hóa off-chain |
| `did_events` | Audit trail cho mọi thay đổi DID |
| `light_score_snapshots` | Snapshot điểm theo epoch, anchor on-chain |

### Edge Functions (1)
| Function | Chức năng |
|----------|-----------|
| `generate-did` | Tạo DID cho user mới |

### Frontend (0 component mới — tích hợp vào các component hiện có)

---

## TÀI LIỆU 2: `LIGHT_SCORE_ACTIVITIES.md` — Khung hoạt động & Chuỗi hành vi

### Database (3 bảng mới + 2 RPC)
| Bảng | Mục đích |
|------|----------|
| `pplp_activity_categories` | 45+ loại hành động → 6 nhóm (self_light, community, content, web3, ecosystem, sequence) |
| `pplp_light_levels` | 5 tầng: Presence → Contributor → Builder → Guardian → Architect |
| `pplp_behavior_sequences` | Theo dõi 5 loại chuỗi (light_growth, mentorship, value_creation, conflict_harmony, economic_integrity) |

| RPC | Công thức |
|-----|-----------|
| `detect_behavior_sequences()` | Tự động phát hiện + thưởng chuỗi hành vi (multiplier 1.5x–3.0x, hết hạn 7 ngày, giới hạn 1/tuần) |
| `get_user_light_level()` | Tính cấp độ Light Level dựa trên điểm tổng hợp |

### Dữ liệu khởi tạo
- **45 loại hành động** được phân loại (từ DAILY_LOGIN đến CODE_CONTRIB)
- **5 tầng Light Level** với ngưỡng điểm và icon/color

### Frontend (3 component)
| Component | Chức năng |
|-----------|-----------|
| `LightActivityCategories` | Hiển thị 6 nhóm hoạt động |
| `BehaviorSequenceTracker` | Theo dõi tiến trình chuỗi hành vi |
| `LightLevelBadge` | Huy hiệu cấp độ Light |

---

## TÀI LIỆU 3: `PPLP_REWARD_MECHANISM.md` — Cơ chế Scoring v2

### Database (6 bảng mới + 4 RPC + 1 trigger)
| Bảng | Mục đích |
|------|----------|
| `pplp_events` | Event store append-only |
| `pplp_ratings` | Rating 5 cột trụ (Truth, Sustain, Heal, Service, Unity) |
| `features_user_day` | Materialized daily features (posts, comments, streak, risk...) |
| `light_score_ledger` | Ledger điểm theo kỳ (daily/weekly/monthly) |
| `score_explanations` | Giải trình điểm số (top contributors + penalties) |
| `content_unified` | View hợp nhất nội dung (posts + journals + chat) |

| Bảng bổ sung | Mục đích |
|------|----------|
| `pplp_mint_cycles` | Chu kỳ mint (weekly/monthly) |
| `pplp_mint_allocations` | Phân bổ FUN cho từng user mỗi cycle |

| RPC | Công thức |
|-----|-----------|
| `calculate_reputation_weight()` | w ∈ [0.5, 1.5] dựa trên days + pass_rate + sequences + trust |
| `calculate_consistency_multiplier()` | 1.0 / 1.3 / 1.6 theo tần suất hoạt động |
| `build_features_user_day()` | Aggregate daily stats |
| `compute_light_score_ledger()` | Tính final score = base × rep × consistency × sequence × (1-penalty) |

| Trigger | Chức năng |
|---------|-----------|
| `bridge_action_to_event` | Auto-insert pplp_events khi pplp_actions được thêm |

### Edge Functions (5 chuẩn hóa)
| Function | API Path |
|----------|----------|
| `pplp-event-ingest` | `/api/v1/events` |
| `pplp-submit-rating` | `/api/v1/pplp/rate` |
| `pplp-light-profile` | `/api/v1/light/profile/{user_id}` |
| `pplp-light-me` | `/api/v1/light/me` |
| `pplp-mint-summary` | `/api/v1/mint/epoch/current` |

### Frontend (9 component)
| Component | Chức năng |
|-----------|-----------|
| `PPLPActionCard` | Hiển thị hành động PPLP |
| `PPLPRatingCard` | UI chấm điểm 5 cột trụ |
| `PPLPScoreRadar` | Biểu đồ radar 5 trụ |
| `ScoreExplanationPanel` | Giải trình chi tiết điểm số |
| `TransparencyDashboard` | Dashboard minh bạch hệ sinh thái |
| `ThreeLayerRewardExplainer` | Giải thích 3 lớp phần thưởng |
| `MintCycleStatus` | Trạng thái chu kỳ mint |
| `PPLPPolicyViewer` | Xem chính sách PPLP |
| `LightActivityCategories` | Phân loại hoạt động |

---

## TÀI LIỆU 4: `LIGHT_SCORE_MATH_SPEC.md` — Công thức toán LS-Math v1.0

### Database (5 RPC mới + bổ sung cột)
| RPC | Công thức |
|-----|-----------|
| `compute_reputation_weight_v2()` | w = clip(0.5, 2.0, 1 + 0.25·log(1+R)) |
| `compute_content_pillar_score()` | P_c = Σ(w_r·s_r) / (Σw_r + ε) với cold-start fallback |
| `compute_daily_light_score()` | L(t) = (ω_B·B + ω_C·C) × M^cons × M^seq × Π |
| `compute_epoch_light_score()` | L(e) = Σ L(t) cho t trong epoch |
| `check_mint_eligibility()` | 4-gate: PPLP accepted + integrity + L_min + no cluster review |

| Bảng cập nhật | Cột mới |
|---------------|---------|
| `scoring_rules` | `formula_json` cập nhật 17 tham số (ω_B, ω_C, α, γ, β, λ, η, κ, θ, π_max, cap...) |
| `features_user_day` | +7 cột: base_action_score, content_score, daily_light_score, consistency_multiplier, sequence_multiplier, integrity_penalty, reputation_weight |
| `pplp_mint_allocations` | +2 cột: eligible, ineligibility_reason |
| `light_score_ledger` | +3 cột: rule_version, reason_codes[], trend |

### Bảng mới (2)
| Bảng | Mục đích |
|------|----------|
| `scoring_rules` | Quản trị phiên bản luật (draft/active/deprecated) |
| `transparency_snapshots` | Snapshot minh bạch toàn hệ mỗi epoch |

### Frontend Engine
| File | Chức năng |
|------|-----------|
| `src/lib/scoring-engine.ts` | Pure functions: computeDailyLightScore, computeMintAllocation, checkMintEligibility, normalizeContentScore... |
| `src/test/scoring-engine.test.ts` | 19 test cases (u_ly simulation, spam burst, rating ring, anti-whale...) |

---

## TÀI LIỆU 5: `SCORING_CONFIG_V1.md` — Config chuẩn LS-Math v1.0

### Database
- **Seed data**: Insert `LS-Math-v1.0` vào `scoring_rules` với status = 'active'
- **17 tham số**: ω_B=0.4, ω_C=0.6, α=0.25, γ=1.3, β=0.6, λ=30, η=0.5, κ=5, θ=0.8, π_max=0.5, cap=3%, L_min=10

### Documentation
| File | Nội dung |
|------|----------|
| `docs/SCORING_CONFIG_V1.md` | Config YAML/JSON chuẩn + ví dụ end-to-end (u_ly: 8.67 Light → 86.7 FUN) + 4 unit test cases |

---

## TÀI LIỆU 6: Anti-Fraud & Cross-Account Detection (tích hợp từ `FUN_CORE_ARCHITECTURE.md` Layer 7)

### Database (1 bảng mới + 4 RPC + 1 trigger cập nhật)
| Bảng | Mục đích |
|------|----------|
| `fraud_whitelist` | Danh sách trắng admin-approved (3 user đã thêm) |

| RPC | Chức năng |
|-----|-----------|
| `detect_cross_account_content_similarity()` | Phát hiện nhiều user đăng cùng nội dung (hash MD5, ngưỡng ≥3 user) |
| `detect_coordinated_timing()` | Phát hiện nhóm user hoạt động đồng bộ (10-min windows, ≥3 ngày) |
| `detect_wallet_clusters()` | Phát hiện ví gom (≥3 user rút về cùng địa chỉ) |
| `run_cross_account_scan()` | Chạy tự động cả 3 scanner + tạo fraud_alerts + thông báo admin |

| Trigger cập nhật |
|------------------|
| `auto_fraud_check()` — Thêm whitelist check: user trong `fraud_whitelist` bypass mọi pattern matching |

### Edge Functions (2)
| Function | Chức năng |
|----------|-----------|
| `fraud-scanner` | Quét gian lận theo lịch |
| `pplp-detect-fraud` | Phát hiện gian lận PPLP realtime |

---

## TỔNG KẾT SỐ LIỆU

```text
┌─────────────────────────────┬──────────┐
│ Hạng mục                    │ Số lượng │
├─────────────────────────────┼──────────┤
│ Bảng database mới           │    16    │
│ RPC / Functions mới         │    13    │
│ Triggers mới                │     2    │
│ Cột bổ sung (ALTER TABLE)   │   ~20    │
│ Edge Functions liên quan    │     8    │
│ Frontend Components         │    12    │
│ Test Cases                  │    19    │
│ Dữ liệu seed (rows)        │   ~50    │
│ Tài liệu docs/             │     1    │
│ Pure function library       │     1    │
│ Database Migrations         │   ~15    │
└─────────────────────────────┴──────────┘
```

### Tính năng hệ thống đảm bảo (từ 6 tài liệu)
- ✔ Không có bảng xếp hạng cá nhân (No Ego)
- ✔ Chỉ hiển thị Level + Trend (không điểm thô công khai)
- ✔ Anti-whale cap 3%
- ✔ Consistency > Burst (diminishing returns)
- ✔ 7-layer anti-sybil (email pattern → content similarity → coordinated timing → wallet cluster)
- ✔ Whitelist mechanism cho admin-approved accounts
- ✔ Rule versioning với audit trail
- ✔ Cold-start fallback cho content rating
- ✔ Reason codes tích cực (CONSISTENCY_STRONG, VALUE_LOOP_ACTIVE...)

