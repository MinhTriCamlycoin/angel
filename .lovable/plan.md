

## Phân tích Tài liệu 3: Thiết kế Logic DB & Kiến trúc AI Chấm Light Score

### Kết quả đối chiếu: 2 gaps cần bổ sung

Tài liệu 3 mô tả 11 bảng DB và kiến trúc AI pipeline. Sau khi đối chiếu từng bảng với database hiện tại:

| Bảng theo Tài liệu 3 | Trạng thái | Ghi chú |
|---|---|---|
| `pplp_events` (events) | ✅ Đầy đủ | 12 cột đúng spec, có `scoring_tags`, `ingest_hash` |
| `pplp_ratings` | ✅ Đầy đủ | 5 pillars (0-2), `weight_applied` snapshot |
| `pplp_fraud_signals` (signals_anti_farm) | ✅ Đầy đủ | signal_type, severity, resolution tracking |
| `features_user_day` | ✅ Đầy đủ | 20 cột, có count_*, multipliers, daily_light_score |
| `light_score_ledger` | ✅ Đầy đủ | base_score → final, explain_ref, rule_version, trend |
| `score_explanations` | ✅ Đầy đủ | ai_pillar_scores, ai_ego_risk, penalties_json |
| `pplp_behavior_sequences` (sequences) | ✅ Đầy đủ | 5 sequence types, stages, multiplier, expires_at |
| `profiles` | ✅ Đầy đủ | completion_pct, pplp_accepted, reputation level |
| `pplp_actions` + `pplp_scores` | ✅ Đầy đủ | Full action lifecycle + scoring results |
| **`mint_epochs`** | ❌ **THIẾU** | Không có bảng quản lý epoch cycle |
| **`mint_allocations`** | ❌ **THIẾU** | Không có bảng lưu phân bổ epoch |
| `pplp_events.signature` | ❌ **THIẾU** | Cột chữ ký wallet/attestation chưa có |

### Gaps cần triển khai

**Gap 1: Thiếu `mint_epochs` và `mint_allocations`**

Hiện tại hệ thống dùng `pplp_epoch_caps` (chỉ tracking daily caps) và `preview_epoch_allocation` RPC (tính on-the-fly). Nhưng theo tài liệu, cần 2 bảng riêng để:
- Lưu trữ lịch sử epoch (draft → finalized → onchain)
- Lưu kết quả phân bổ cho từng user kèm `onchain_tx_hash`
- Audit trail cho mỗi chu kỳ mint

Sẽ tạo:
- `mint_epochs`: epoch_id, period_start, period_end, mint_pool_amount, rules_version, status, total_light, user_count
- `mint_allocations`: epoch_id (FK), user_id, eligible, light_score, contribution_ratio, allocation_amount, reason_codes, onchain_tx_hash

**Gap 2: Thiếu cột `signature` trên `pplp_events`**

Cột này cho phép ký event bằng wallet (attestation), quan trọng cho on-chain verification sau này.

Sẽ thêm: `ALTER TABLE pplp_events ADD COLUMN signature TEXT`

### Kiến trúc AI — Đã triển khai đầy đủ

4 dịch vụ AI theo tài liệu đều đã có:
1. **Policy & Integrity Service** → `pplp-detect-fraud` edge function + `pplp_fraud_signals`
2. **Content & Pillar Analyzer (AI)** → `pplp-ai-pillar-analyzer` edge function (Gemini 3 Flash) → `score_explanations.ai_pillar_scores` + `ai_ego_risk`
3. **Reputation & Weight Service** → `compute_reputation_weight_v2` RPC
4. **Scoring Engine (Deterministic)** → `pplp-compute-daily-scores` + `scoring-engine.ts`

Anti-Ego principles (no leaderboard, Level/Trend only, epoch-delayed mint) — all implemented.

### Tóm tắt triển khai

1. Tạo migration thêm bảng `mint_epochs` + `mint_allocations` với RLS policies
2. Thêm cột `signature` vào `pplp_events`
3. Cập nhật `pplp-epoch-reset` edge function để ghi vào `mint_epochs`/`mint_allocations` thay vì chỉ tính on-the-fly

