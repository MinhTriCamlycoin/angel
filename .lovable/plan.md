

## Vấn đề

Hiện tại có **2 hàm tính cấp độ Light Level khác nhau**, sử dụng **2 nguồn dữ liệu khác nhau**:

1. **`get_user_light_level`** (dùng ở trang MINT FUN, trang Earn): Tính từ `pplp_scores` → `AVG(light_score) * 10 + completed_sequences * 50`
2. **`get_community_light_summary`** (dùng ở bảng cộng đồng ánh sáng): Tính từ `SUM(features_user_day.daily_light_score)` → luôn = 0 vì bảng này chưa có dữ liệu

Kết quả: Trang MINT FUN hiển thị đúng (ví dụ Level 3 - Người xây dựng), nhưng bảng cộng đồng ánh sáng luôn hiển thị Level 1 mặc định.

## Giải pháp

Đồng bộ hàm `get_community_light_summary` để sử dụng cùng logic tính điểm với `get_user_light_level` (dựa trên `pplp_scores`).

### Bước 1: Migration cập nhật hàm `get_community_light_summary`

Viết lại hàm SQL để tính điểm giống `get_user_light_level`:
- Dùng `AVG(light_score)` từ `pplp_scores` thay vì `SUM(daily_light_score)` từ `features_user_day`
- Cộng thêm `completed_sequences * 50`
- Tra cấp độ từ bảng `pplp_light_levels` với tổng điểm đã tính

### Bước 2: Không cần thay đổi code frontend

Cả `useLeaderboard.ts`, `LightCommunity.tsx`, và các component `LightLevelBadge` đều đã gọi đúng hàm — chỉ cần sửa logic phía database.

