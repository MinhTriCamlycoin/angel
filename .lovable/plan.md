

# Chuyển tất cả user tạm thời → Cấm vĩnh viễn + Từ chối rút tiền & mint

## Giải pháp

### 1. Tạo Edge Function `convert-temp-to-permanent/index.ts`

Chức năng:
- Xác thực admin role
- Query tất cả `user_suspensions` có `suspension_type = 'temporary'` và `lifted_at IS NULL`
- Update: `suspension_type → 'permanent'`, `suspended_until → null`
- **Không gửi healing message** (theo yêu cầu)
- Từ chối tất cả `coin_withdrawals` có `status = 'pending'` của các user này
- Từ chối tất cả `pplp_mint_requests` có `status IN ('pending', 'pending_sig')` của các user này
- Hoàn tiền withdrawal về balance cho user (refund pending amount)
- Trả về số lượng đã xử lý

### 2. Thêm nút trong `AdminFraudAlerts.tsx`

Trong tab "Đã đình chỉ", bên cạnh summary cards:
- Nút "Chuyển tất cả → Vĩnh viễn" (chỉ hiện khi có user tạm thời)
- AlertDialog xác nhận trước khi thực hiện
- Hiển thị số user sẽ bị ảnh hưởng
- Gọi edge function, toast kết quả, refresh danh sách

## Files

1. **Tạo mới**: `supabase/functions/convert-temp-to-permanent/index.ts`
2. **Sửa**: `src/pages/AdminFraudAlerts.tsx` — thêm nút + dialog

