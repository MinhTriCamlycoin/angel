

## Kế hoạch: Loại trừ tài khoản bị cấm/đình chỉ khỏi Blacklist

### Sửa `src/pages/AdminTrustList.tsx` — hàm `fetchBlacklist()`

Sau khi lấy danh sách `actor_id` từ `pplp_fraud_signals`, thêm bước truy vấn bảng `user_suspensions` để tìm các user đang bị đình chỉ hoặc cấm vĩnh viễn (có record với `lifted_at IS NULL`), sau đó loại bỏ các user này khỏi kết quả blacklist.

**Logic:**
1. Lấy danh sách `actorIds` như hiện tại
2. Query `user_suspensions` với điều kiện `user_id IN actorIds` và `lifted_at IS NULL` (đang còn hiệu lực)
3. Tạo Set các `suspended_user_ids`
4. Filter `grouped` map để loại bỏ các actor có trong Set đó

Chỉ sửa 1 file: `src/pages/AdminTrustList.tsx`.

