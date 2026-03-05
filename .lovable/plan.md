

# Lọc user bị cấm vĩnh viễn khỏi danh sách rút thưởng

## Vấn đề

Trong `fetchWithdrawals()` tại `src/pages/AdminWithdrawals.tsx`, hệ thống query tất cả `coin_withdrawals` mà không kiểm tra trạng thái đình chỉ của user. Do đó, các user đã bị cấm vĩnh viễn vẫn xuất hiện trong danh sách pending.

## Giải pháp

Sửa `src/pages/AdminWithdrawals.tsx` trong hàm `fetchWithdrawals()`:

1. **Sau khi lấy danh sách userIds**, query thêm bảng `user_suspensions` để lấy danh sách user đang bị đình chỉ (có `lifted_at IS NULL`).
2. **Đánh dấu trực quan** các withdrawal từ user bị ban bằng badge đỏ "Đã cấm" bên cạnh tên.
3. **Thêm nút tự động từ chối** tất cả pending withdrawals từ user bị ban — gọi bulk update `status = 'failed'` với ghi chú "Tài khoản bị cấm vĩnh viễn".
4. Thêm field `is_banned` vào interface `Withdrawal` để lưu trạng thái.

## Thay đổi cụ thể

**File: `src/pages/AdminWithdrawals.tsx`**

- Thêm field `is_banned?: boolean` vào interface `Withdrawal`
- Trong `fetchWithdrawals()`: query `user_suspensions` để tạo `bannedSet`, gắn `is_banned` vào mỗi withdrawal
- Hiển thị badge "🚫 Đã cấm" bên cạnh tên user nếu `is_banned`
- Thêm nút "Từ chối tất cả user bị cấm" phía trên bảng, tự động reject tất cả pending withdrawals của user bị ban

