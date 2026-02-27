

## Kế hoạch: Scoring Rule Versioning + API + Reason Codes + Transparency Dashboard (Phần 3–9)

### ✅ Đã triển khai hoàn chỉnh

---

### Bước 1: Database Migration ✅

| # | Đối tượng | Trạng thái |
|---|-----------|-----------|
| 1 | Bảng `scoring_rules` | ✅ Đã tạo |
| 2 | Cột `rule_version` trong `light_score_ledger` | ✅ Đã thêm |
| 3 | Cột `reason_codes TEXT[]` trong `light_score_ledger` | ✅ Đã thêm |
| 4 | Cột `trend TEXT` trong `light_score_ledger` | ✅ Đã thêm |
| 5 | Bảng `transparency_snapshots` | ✅ Đã tạo |
| 6 | Cột `max_share_per_user` trong `pplp_mint_cycles` | ✅ Đã thêm |
| 7 | Seed `scoring_rules` V1.0 | ✅ Đã insert |

### Bước 2: Edge Functions — 5 API Endpoints ✅

| # | Function | Trạng thái |
|---|----------|-----------|
| 1 | `pplp-event-ingest` | ✅ Đã tạo |
| 2 | `pplp-submit-rating` | ✅ Đã tạo |
| 3 | `pplp-light-profile` | ✅ Đã tạo |
| 4 | `pplp-light-me` | ✅ Đã tạo |
| 5 | `pplp-mint-summary` | ✅ Đã tạo |

### Bước 3: Cập nhật `pplp-score-action` ✅

| # | Thay đổi | Trạng thái |
|---|----------|-----------|
| 1 | Reason codes tích cực | ✅ 12 codes |
| 2 | Rule version từ `scoring_rules` | ✅ |
| 3 | Trend calculation | ✅ |

### Bước 4: Cập nhật `process-mint-cycle` ✅

| # | Thay đổi | Trạng thái |
|---|----------|-----------|
| 1 | Anti-whale cap (3% default) | ✅ Two-pass allocation |
| 2 | Transparency snapshots | ✅ Auto-insert |

### Bước 5: Frontend ✅

| # | Component | Trạng thái |
|---|-----------|-----------|
| 1 | `TransparencyDashboard` | ✅ Đã tạo |
| 2 | `LightLevelBadge` + Trend | ✅ Đã cập nhật |
| 3 | `ScoreExplanationPanel` + reason codes + rule_version | ✅ Đã cập nhật |

### Bước 6: Tài liệu ✅
Cập nhật `docs/PPLP_REWARD_MECHANISM.md`
