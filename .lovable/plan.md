

# Kế hoạch: Finalize Epoch cho tháng 01 và 02/2026

## Vấn đề
- `light_score_ledger` có 355 records (136 users tháng 1, 219 users tháng 2)
- Nhưng `mint_epochs` và `mint_allocations` đều trống — epoch chưa bao giờ được finalize
- Users có Light Score nhưng chưa được phân bổ FUN

## Giải pháp

### Bước 1: Chạy `pplp-epoch-reset` cho tháng 01/2026
Gọi edge function với body `{ "year": 2026, "month": 1 }`:
- Tạo `mint_epochs` record cho period "2026-01"
- Ghi `mint_allocations` cho 136 users dựa trên `light_score_ledger` (tổng 11,594 Light)
- Trigger `pplp-epoch-allocate` để tính FUN allocation từ pool

### Bước 2: Chạy `pplp-epoch-reset` cho tháng 02/2026
Gọi edge function với body `{ "year": 2026, "month": 2 }`:
- Tạo `mint_epochs` record cho period "2026-02"  
- Ghi `mint_allocations` cho 219 users dựa trên `light_score_ledger` (tổng 244,873 Light)
- Trigger `pplp-epoch-allocate` để tính FUN allocation từ pool

### Bước 3: Xác minh kết quả
- Kiểm tra `mint_epochs` có 2 records (finalized)
- Kiểm tra `mint_allocations` có đủ users
- Kiểm tra FUN allocation đã được tính đúng theo tỷ lệ contribution_ratio

### Lưu ý quan trọng
- Hàm `pplp-epoch-reset` hiện đọc từ `features_user_day` (không phải `light_score_ledger`) để tính toán. Vì `light_score_ledger` đã có sẵn dữ liệu cho 2 tháng này, cần xác nhận `features_user_day` cũng có dữ liệu tương ứng, nếu không cần điều chỉnh function để đọc trực tiếp từ `light_score_ledger`.
- Cycle #1 đang mở cho tháng 3 — sẽ không bị ảnh hưởng vì epoch reset chỉ target tháng 1 và 2.
- Cần set `total_mint_pool` cho 2 epoch cũ (hiện mặc định = 0 trong `mint_epochs`, sẽ cần cập nhật thủ công hoặc qua `pplp-epoch-allocate`).

## Files thay đổi
Không cần sửa code. Chỉ cần gọi edge function 2 lần với tham số đúng, sau đó xác minh dữ liệu.

