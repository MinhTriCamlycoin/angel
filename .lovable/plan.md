

## Vấn đề

Edge function `global-search` đã có logic tìm kiếm user theo `display_name`, `handle`, và `wallet_address` — nhưng đang truy vấn bảng `saved_wallet_addresses` (không tồn tại). Bảng thực tế là `user_wallet_addresses`.

Ngoài ra, community variant (search trực tiếp từ frontend) chỉ tìm theo `display_name`, chưa tìm theo `handle` hay `wallet_address`.

## Giải pháp

### Bước 1: Sửa edge function `global-search/index.ts`
- Đổi `saved_wallet_addresses` → `user_wallet_addresses` (dòng 113)
- Giữ nguyên logic tìm theo `display_name`, `handle`, `wallet_address`

### Bước 2: Cập nhật frontend `GlobalSearch.tsx` (community variant)
- Mở rộng search community để tìm theo cả `handle` và `wallet_address`:
  - Query profiles với `.or('display_name.ilike.%query%,handle.ilike.%query%')`
  - Thêm query song song vào `user_wallet_addresses` để tìm theo ví
  - Merge kết quả, loại trùng

### Bước 3: Cập nhật URL user trong edge function
- Sửa URL từ `/user/${id}` thành sử dụng handle nếu có: `/u/${handle}` hoặc `/user/${id}`

