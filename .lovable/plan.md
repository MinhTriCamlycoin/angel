

## Kế hoạch: Event-based Scoring Model + AI Light Score Architecture

Yêu cầu này bổ sung 7 bảng mới và 3 RPC/trigger để chuyển hệ thống PPLP sang mô hình Event-sourcing hoàn chỉnh. Nhiều bảng đã tồn tại (pplp_actions, pplp_scores, pplp_behavior_sequences, pplp_fraud_signals, pplp_mint_cycles, pplp_mint_allocations) nên chỉ cần tạo các bảng còn thiếu và cập nhật logic.

### Ánh xạ: Bản thiết kế → Hệ thống hiện tại

| Bản thiết kế | Đã có? | Hành động |
|---|---|---|
| `users` | ✅ `auth.users` + `user_light_agreements` | Không cần |
| `profiles` | ✅ `profiles` (thiếu `pplp_accepted_at`, `reputation_level`) | **Thêm cột** |
| `content` | ❌ (dữ liệu rải ở `community_posts`, `gratitude_journal`) | **Tạo view** `content_unified` |
| `events` | ❌ (dùng `pplp_actions` nhưng thiếu chuẩn event-sourcing) | **Tạo bảng** `pplp_events` |
| `pplp_ratings` | ❌ | **Tạo bảng** |
| `signals_anti_farm` | ✅ `pplp_fraud_signals` | Không cần |
| `features_user_day` | ❌ | **Tạo bảng** |
| `light_score_ledger` | ❌ (chỉ có `pplp_scores` per-action) | **Tạo bảng** |
| `score_explanations` | ❌ | **Tạo bảng** |
| `mint_epochs` | ✅ `pplp_mint_cycles` | Không cần |
| `mint_allocations` | ✅ `pplp_mint_allocations` | Không cần |
| `sequences` | ✅ `pplp_behavior_sequences` | Không cần |

---

### Bước 1: Database Migration — 5 bảng mới + cập nhật profiles

| # | Đối tượng | Chi tiết |
|---|-----------|---------|
| 1 | Thêm cột vào `profiles` | `pplp_accepted_at`, `pplp_version`, `mantra_ack_at`, `reputation_level` (enum: seed/sprout/builder/guardian/architect), `reputation_score` |
| 2 | Tạo `pplp_events` (append-only) | `event_id`, `event_type`, `actor_user_id`, `target_type`, `target_id`, `context_id`, `occurred_at`, `source`, `payload_json`, `ingest_hash`, `scoring_tags` |
| 3 | Tạo `pplp_ratings` | `rating_id`, `content_id`, `rater_user_id`, 5 cột trụ (0/1/2), `comment`, `weight_applied` |
| 4 | Tạo `features_user_day` | PK `(user_id, date)`, count_posts, count_comments, count_help, avg_rating_weighted, consistency_streak, sequence_count, anti_farm_risk |
| 5 | Tạo `light_score_ledger` | `user_id`, `period`, `period_start/end`, base_score, 4 multipliers, final_light_score, `level`, `explain_ref` |
| 6 | Tạo `score_explanations` | `explain_ref` (PK), `top_contributors_json`, `penalties_json`, `version` |
| 7 | Tạo view `content_unified` | Union từ `community_posts`, `gratitude_journal`, `chat_history` |
| 8 | RPC `build_features_user_day(_user_id, _date)` | Aggregate events → ghi vào `features_user_day` |
| 9 | RPC `compute_light_score_ledger(_user_id, _period, _start, _end)` | Tính điểm tổng hợp theo chu kỳ → ghi `light_score_ledger` + `score_explanations` |
| 10 | Trigger trên `pplp_actions` | Auto-insert vào `pplp_events` khi action mới được tạo (bridge event-sourcing) |

### Bước 2: Cập nhật Edge Function `pplp-score-action`

| # | Thay đổi |
|---|----------|
| 1 | Sau khi insert `pplp_scores`, auto-insert `pplp_events` record với đầy đủ schema chuẩn |
| 2 | Gọi `build_features_user_day` để cập nhật materialized features |
| 3 | Insert `score_explanations` kèm chi tiết top contributors & penalties |

### Bước 3: Edge Function mới `pplp-ai-pillar-analyzer`

| # | Chức năng |
|---|-----------|
| 1 | Nhận content (post/journal/comment) → gọi Lovable AI (gemini-3-flash-preview) |
| 2 | Phân tích 5 cột trụ (0/1/2 cho mỗi trụ) + Ego Risk Score (0–1) |
| 3 | Trả về `ai_pillar_scores`, `ai_ego_risk`, `ai_explanations` |
| 4 | Được gọi bởi `pplp-score-action` khi action có content để phân tích |

### Bước 4: Frontend — Thêm PPLP Rating UI + Score Explanation

| # | Component | Mô tả |
|---|-----------|-------|
| 1 | `PPLPRatingCard` | Form cho user chấm điểm 5 trụ (0/1/2) cho bài viết cộng đồng |
| 2 | `PPLPScoreRadar` cập nhật | Hiển thị dữ liệu từ `light_score_ledger` thay vì per-action scores |
| 3 | `ScoreExplanationPanel` | Hiển thị lý do điểm (audit trail) — chỉ cho chính user xem |

### Bước 5: Tài liệu

| # | Tệp |
|---|-----|
| 1 | Cập nhật `docs/PPLP_REWARD_MECHANISM.md` với Event-based Scoring Model schema và AI Architecture diagram |

---

### Chi tiết kỹ thuật

**Event Schema chuẩn (`pplp_events`):**
```text
event_id       UUID PK
event_type     TEXT (LOGIN, POST_CREATED, PPLP_RATING_SUBMITTED, ...)
actor_user_id  UUID FK
target_type    TEXT (user/content/wallet/system)
target_id      UUID nullable
context_id     UUID nullable (session/thread/group)
occurred_at    TIMESTAMPTZ
source         TEXT (web/mobile/api)
payload_json   JSONB
ingest_hash    TEXT (keccak256 of payload for tamper detection)
scoring_tags   TEXT[] (pplp_pillar_candidate, sequence_candidate)
```

**AI Pillar Analyzer prompt flow:**
```text
Content → Lovable AI (gemini-3-flash-preview)
  → Tool call: analyze_pplp_pillars
  → Returns: {
      pillars: { truth: 0-2, sustain: 0-2, heal: 0-2, service: 0-2, unity: 0-2 },
      ego_risk: 0.0-1.0,
      explanation: "..."
    }
```

**Pipeline hoàn chỉnh:**
```text
Event Ingest → pplp_events (append-only)
  → Validate (dedupe via ingest_hash, policy check)
  → Feature Builder (build_features_user_day)
  → Scoring Engine (pplp-score-action + AI analyzer)
  → light_score_ledger + score_explanations
  → Mint Engine (process-mint-cycle, epoch-based)
  → On-chain Execution
```

