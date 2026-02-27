

## Kế hoạch: User WL không bị rà soát và không nằm trong BL

### Vấn đề hiện tại
Dù `anti-sybil.ts` đã kiểm tra whitelist, còn **4 edge function khác** truy vấn `pplp_fraud_signals` trực tiếp mà **không kiểm tra whitelist**:
1. `pplp-detect-fraud/index.ts` — vẫn tạo fraud signal mới cho user WL
2. `pplp-authorize-mint/index.ts` — chặn mint nếu có fraud signal, không kiểm tra WL
3. `pplp-batch-lock/index.ts` — chặn batch lock nếu có fraud signal, không kiểm tra WL
4. `pplp-score-action/index.ts` — tính integrity penalty từ fraud signals, không kiểm tra WL

### Sửa đổi

**1. `pplp-detect-fraud/index.ts`** — Thêm kiểm tra whitelist ngay đầu. Nếu user đã WL → trả về `risk_score: 0`, không chạy fraud checks, không tạo signal mới.

**2. `pplp-authorize-mint/index.ts`** — Thêm kiểm tra whitelist trước đoạn CHECK FRAUD SIGNALS. Nếu WL → bỏ qua fraud check.

**3. `pplp-batch-lock/index.ts`** — Tương tự, kiểm tra whitelist trước fraud check.

**4. `pplp-score-action/index.ts`** — 2 chỗ:
  - Integrity penalty calculation (line ~322): Bỏ qua nếu WL
  - Auto-mint fallback fraud check (line ~646): Bỏ qua nếu WL

**5. Database cleanup** — Resolve tất cả `pplp_fraud_signals` chưa xử lý của các user đang trong `fraud_whitelist`, đảm bảo WL và BL không chồng chéo.

**6. `run_cross_account_scan()` DB function** — Thêm loại trừ user WL khi tạo fraud signal tự động.

