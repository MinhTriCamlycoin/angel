
# Kế hoạch chuyển đổi sang Mô hình Epoch-Based Minting (đúng LS-Math v1.0)

## Ý nghĩa của việc chuyển đổi — Giải thích cho user

### Mô hình hiện tại (Per-Action — sai đặc tả)
Hiện tại, mỗi khi user thực hiện một hành động (đăng bài, bình luận, hỏi AI...), hệ thống:
1. Chấm điểm hành động → tạo `pplp_mint_requests` ngay lập tức
2. Admin duyệt từng yêu cầu → ký EIP-712 → lock on-chain
3. User nhận FUN Money ngay sau khi được duyệt

**Vấn đề:** Mô hình này tạo ra hành vi "săn phần thưởng tức thì" (dopamine-driven), dễ bị farming, và không phản ánh đúng giá trị đóng góp dài hạn.

### Mô hình mới (Epoch-Based — đúng đặc tả LS-Math v1.0 §12-14)
- FUN Money được tính theo **chu kỳ tháng** (epoch), không phải từng hành động
- Cuối mỗi tháng, hệ thống tổng hợp Light Score của tất cả user → phân bổ từ **Mint Pool** chung theo tỷ lệ đóng góp
- Có **kiểm tra đủ điều kiện** (eligibility): PPLP accepted, integrity score OK, L_min ≥ 10, không có fraud
- Có **anti-whale cap** (3%): không ai được nhận quá 3% tổng pool
- Kết quả minh bạch qua `transparency_snapshots`

**Triết lý:** "Tiền = Dòng chảy Ánh sáng" — Không thưởng cho ồn ào, chỉ thưởng cho đóng góp thật sự qua thời gian.

---

## Phân tích hiện trạng kỹ thuật

### Đã có sẵn (hoạt động tốt)
- `pplp-compute-daily-scores`: Tính Light Score hàng ngày → `features_user_day` ✅
- `pplp-epoch-reset`: Reset chu kỳ tháng, tổng hợp vào `light_score_ledger` ✅
- `process-mint-cycle`: Logic epoch allocation đầy đủ (eligibility, anti-whale, transparency) ✅
- `check_mint_eligibility` RPC: Kiểm tra 4 điều kiện mint ✅
- `pplp_mint_cycles` table: Chu kỳ #1 đang `open` (03/2026) ✅

### Cần thay đổi
Hiện tại flow per-action (`requestMint` → `pplp_mint_requests` → `pplp-authorize-mint`) chạy **song song** với epoch system nhưng epoch system không thực sự phân bổ FUN vì `total_mint_pool = 0`.

---

## Kế hoạch triển khai

### 1. Tạo Edge Function mới: `pplp-epoch-allocate`
Hàm này chạy cuối tháng (hoặc admin trigger thủ công) để:
- Tổng hợp `light_score_ledger` cho tháng hiện tại
- Tính mint pool = tổng Light Score eligible (capped tại 5M FUN/tháng)
- Chạy eligibility check cho từng user (§13)
- Phân bổ FUN theo tỷ lệ Light Score với anti-whale cap (§14)
- Tạo `pplp_mint_allocations` cho mỗi user eligible
- Áp dụng cascading distribution (Genesis/Platform/Partners/User)
- Tạo `pplp_mint_requests` dạng batch cho mỗi allocation
- Tạo `transparency_snapshots`

### 2. Cập nhật `pplp-epoch-reset` 
Thêm bước gọi `pplp-epoch-allocate` trước khi reset, đảm bảo tháng cũ được phân bổ trước khi mở tháng mới.

### 3. Cập nhật UI — `MintCycleStatus`
- Hiển thị epoch progress rõ ràng (ngày còn lại, Light Score tích lũy trong epoch)
- Hiển thị dự kiến phân bổ FUN dựa trên Light Score hiện tại
- Hiển thị kết quả allocation sau khi epoch kết thúc

### 4. Cập nhật trang Admin Mint Approval
- Thêm tab/view "Epoch Allocations" để admin xem/duyệt phân bổ epoch
- Admin có thể trigger `pplp-epoch-allocate` thủ công
- Hiển thị transparency snapshot cho mỗi epoch

### 5. Cập nhật flow User Mint
- Thay đổi `useMintRequest`: User không tạo mint request per-action nữa
- User chỉ thấy kết quả allocation sau khi epoch kết thúc
- Giữ nguyên flow Activate → Claim on-chain

### 6. Tạo DB function tính epoch allocation preview
Cho phép user xem dự kiến phân bổ FUN dựa trên Light Score hiện tại trong epoch đang mở.

### 7. Xử lý dữ liệu hiện tại
- 4,663 pending mint requests hiện tại cần được quyết định: duyệt hết theo mô hình cũ hoặc chuyển sang epoch mới
- Đề xuất: Duyệt hết pending requests hiện tại (tháng 2), sau đó áp dụng epoch-based từ tháng 3/2026

---

## Chi tiết kỹ thuật

### Cấu trúc `pplp-epoch-allocate`
```text
Input: { epoch_period: "2026-03" } (hoặc auto = tháng trước)

Flow:
1. Lấy light_score_ledger cho period
2. Cho mỗi user: check_mint_eligibility()
3. Tính total eligible light = Σ L_u(e)
4. Mint pool M(e) = min(5,000,000, total_eligible_light)
5. A_u(e) = M(e) × L_u(e) / T(e)  [với anti-whale cap 3%]
6. Cascading distribution per user
7. Insert pplp_mint_allocations
8. Insert pplp_mint_requests (batch per user)
9. Insert transparency_snapshot
10. Thông báo cho users
```

### UI Changes
- `MintActionsList`: Ẩn nút "Yêu cầu Mint" per-action, thay bằng thông báo epoch
- `MintCycleStatus`: Thêm Light Score hiện tại + dự kiến allocation
- `AdminMintApproval`: Thêm panel epoch management

