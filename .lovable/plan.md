

## Kế hoạch: Scoring Rule Versioning + API + Reason Codes + Transparency Dashboard (Phần 3–9)

### Hiện trạng
- `scoring_rules` table: **chưa có** (chỉ có `pplp_policies` với schema khác)
- `light_score_ledger`: **thiếu cột** `rule_version`
- API endpoints chuẩn hoá: **chưa có** (chỉ có edge functions riêng lẻ)
- Reason codes tích cực: **chưa có** hệ thống chuẩn
- Anti-whale cap: **chưa có** trong `process-mint-cycle`
- Transparency Dashboard: **chưa có**

---

### Bước 1: Database Migration

| # | Đối tượng | Chi tiết |
|---|-----------|---------|
| 1 | Tạo bảng `scoring_rules` | `rule_version` PK, `name`, `description`, `formula_json`, `weight_config_json`, `multiplier_config_json`, `penalty_config_json`, `effective_from`, `effective_to`, `status` (draft/active/deprecated) |
| 2 | Thêm cột `rule_version TEXT` vào `light_score_ledger` | Liên kết mỗi kỳ tính điểm với rule cụ thể |
| 3 | Thêm cột `reason_codes TEXT[]` vào `light_score_ledger` | Lưu reason codes tích cực cho mỗi entry |
| 4 | Thêm cột `trend TEXT` vào `light_score_ledger` | Giá trị: stable/growing/reflecting/rebalancing |
| 5 | Tạo bảng `transparency_snapshots` | `epoch_id`, `total_light_system`, `total_fun_minted`, `allocation_by_level JSONB`, `mentor_chains_completed INT`, `value_loops_completed INT`, `active_users INT`, `created_at` |
| 6 | Thêm cột `max_share_per_user NUMERIC DEFAULT 0.03` vào `pplp_mint_cycles` | Anti-whale cap (3% mặc định) |
| 7 | Insert bản ghi `scoring_rules` V1.0 | Seed data với formula & weights hiện tại |

### Bước 2: Edge Functions — 5 API Endpoints chuẩn hoá

| # | Function | Method | Mô tả |
|---|----------|--------|-------|
| 1 | `pplp-event-ingest` | POST | Nhận event chuẩn → validate → insert `pplp_events` → trả `event_id` |
| 2 | `pplp-submit-rating` | POST | Nhận rating 5 trụ → validate → insert `pplp_ratings` với `weight_applied` |
| 3 | `pplp-light-profile` | GET | Trả Light Level + Trend + streak + sequences (public-safe, không raw score) |
| 4 | `pplp-light-me` | GET | Trả chi tiết score riêng tư cho chính user (period, multipliers, reason_codes) |
| 5 | `pplp-mint-summary` | GET | Trả epoch summary (mint_pool, total_light, rule_version, anti-whale cap) |

### Bước 3: Cập nhật `pplp-score-action` — Reason Codes + Rule Version

| # | Thay đổi |
|---|----------|
| 1 | Thêm hệ thống reason codes tích cực (CONSISTENCY_STRONG, MENTOR_CHAIN_COMPLETED, VALUE_LOOP_ACTIVE...) |
| 2 | Lưu `rule_version` từ `scoring_rules` active vào `pplp_scores` và `light_score_ledger` |
| 3 | Tính `trend` dựa trên so sánh score hiện tại vs period trước |

### Bước 4: Cập nhật `process-mint-cycle` — Anti-Whale + Transparency

| # | Thay đổi |
|---|----------|
| 1 | Áp dụng `max_share_per_user` cap (mặc định 3% of epoch pool) |
| 2 | Sau khi finalize, insert `transparency_snapshots` với thống kê toàn hệ |

### Bước 5: Frontend — Transparency Dashboard + Level/Trend UI

| # | Component | Mô tả |
|---|-----------|-------|
| 1 | `TransparencyDashboard` | Hiển thị tổng Light toàn hệ, FUN Minted, % theo Level, mentor chains, value loops — không cá nhân |
| 2 | Cập nhật `LightLevelBadge` | Thêm hiển thị Trend (Growing/Stable/Reflecting/Rebalancing) |
| 3 | Cập nhật `ScoreExplanationPanel` | Hiển thị reason codes bằng ngôn ngữ tích cực, hiển thị rule_version |

### Bước 6: Tài liệu

| # | Tệp |
|---|-----|
| 1 | Cập nhật `docs/PPLP_REWARD_MECHANISM.md` — thêm Scoring Rule Versioning, API Endpoints, Reason Codes, Level System, Anti-Whale, Transparency |

---

### Chi tiết kỹ thuật

**Reason Codes (ngôn ngữ tích cực):**
```text
Tích cực: CONSISTENCY_STRONG, MENTOR_CHAIN_COMPLETED, VALUE_LOOP_ACTIVE,
          COMMUNITY_VALIDATED, CROSS_PLATFORM_CONTRIBUTOR,
          HEALING_IMPACT_DETECTED, GOVERNANCE_PARTICIPATION

Điều chỉnh: INTERACTION_PATTERN_UNSTABLE, RATING_CLUSTER_REVIEW,
            CONTENT_REVIEW_IN_PROGRESS, TEMPORARY_WEIGHT_ADJUSTMENT,
            QUALITY_SIGNAL_LOW
```

**Anti-Whale trong Mint Engine:**
```text
user_share = user_contribution / total_contribution
capped_share = MIN(user_share, max_share_per_user)  // default 3%
allocation = capped_share * mint_pool
// Excess redistributed proportionally to others
```

**Level + Trend mapping:**
```text
0–20: Light Seed    | Trend: stable/growing/reflecting/rebalancing
21–40: Light Sprout  | (based on comparing current vs previous period)
41–60: Light Builder |
61–80: Light Guardian|
81+:   Light Architect|
```

