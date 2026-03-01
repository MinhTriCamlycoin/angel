

## Phân tích Tài liệu 4 (Thực sự): Scoring Rule Versioning, API, Reason Codes, Transparency

### Kết quả: 2 gaps nhỏ cần bổ sung

Tài liệu này mô tả 9 phần. Sau khi đối chiếu với codebase:

| Phần | Trạng thái | Chi tiết |
|---|---|---|
| **Phần 3: Scoring Rule Versioning** | ✅ | Bảng `scoring_rules` có đầy đủ (V1.0 + LS-Math-v1.0), `light_score_ledger.rule_version` đã có, migration strategy đúng (không tính lại quá khứ) |
| **Phần 4: API Endpoints** | ✅ | 5 edge functions đã triển khai: `pplp-event-ingest`, `pplp-submit-rating`, `pplp-light-profile`, `pplp-light-me`, `pplp-mint-summary` |
| **Phần 5: Reason Codes tích cực** | ⚠️ **Thiếu 2** | 7 positive codes: thiếu `GOVERNANCE_PARTICIPATION`. 5 adjustment codes: thiếu `INTERACTION_PATTERN_UNSTABLE`, `RATING_CLUSTER_REVIEW`, `CONTENT_REVIEW_IN_PROGRESS` |
| **Phần 6: Level System** | ✅ | 5 levels đúng spec, chỉ hiển thị Level + Trend, không ranking |
| **Phần 7: Mint Engine** | ✅ | Anti-whale 3%, epoch flow 7 bước, `mint_epochs` + `mint_allocations` đã có |
| **Phần 8: Transparency Dashboard** | ✅ | `TransparencyDashboard.tsx` hiển thị đúng 5 chỉ số, không lộ cá nhân |
| **Phần 9: Bảo vệ dài hạn** | ✅ | Fraud detection, random audit, slow mint curve đã có |

### Gaps cần triển khai

**Gap: Thiếu 4 Reason Codes trong scoring engine**

Hiện tại `pplp-score-action/index.ts` chỉ phát ra 7 codes. Thiếu:
1. `GOVERNANCE_PARTICIPATION` — khi user có event `GOV_VOTE_CAST` gần đây
2. `INTERACTION_PATTERN_UNSTABLE` — khi fraud signals có `signal_type` liên quan đến pattern instability
3. `RATING_CLUSTER_REVIEW` — khi fraud signals phát hiện ring rating
4. `CONTENT_REVIEW_IN_PROGRESS` — khi user có nội dung đang bị review

Cả 4 codes này đã được định nghĩa trong `docs/PPLP_REWARD_MECHANISM.md` và `ScoreExplanationPanel.tsx` đã render chúng đúng, nhưng scoring engine chưa phát ra.

### Kế hoạch triển khai

1. Cập nhật `pplp-score-action/index.ts` — thêm logic phát 4 reason codes còn thiếu vào section 7b
2. Deploy edge function

Thay đổi rất nhỏ, chỉ thêm ~30 dòng code kiểm tra thêm trong scoring engine.

