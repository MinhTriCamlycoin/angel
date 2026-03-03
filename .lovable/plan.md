

# Nguyên nhân Light Score = 0 của angelthutrang

## Phát hiện

Sau khi kiểm tra database, có **2 vấn đề** gây ra Light Score = 0:

### Vấn đề 1: Không có dữ liệu trong pipeline chấm điểm
- Bảng `light_score_ledger` hiện **hoàn toàn trống** (0 rows cho tất cả users, không chỉ angelthutrang).
- Bảng `pplp_events` cũng **0 sự kiện** cho user này (user_id: `e4c17387-...`).
- Bảng `pplp_actions` cũng **0 actions** cho user này.

**Nguyên nghĩa:** Hệ thống chấm điểm (scoring pipeline) chưa từng ghi nhận hoạt động nào của user này vào các bảng PPLP. Dù user có 75 bài viết và 154 chat, các hoạt động đó chưa được ingest vào pipeline scoring (`pplp_events` → `pplp_actions` → `light_score_ledger`).

### Vấn đề 2: Code truy vấn sai tên cột
- Code trong `UnifiedDashboard.tsx` (dòng 17) và `UnifiedLightScore.tsx` truy vấn cột `total_light_score` — **cột này không tồn tại** trong bảng `light_score_ledger`.
- Tên cột đúng là `final_light_score`.
- Query trả về null → hiển thị 0.

## Kế hoạch sửa

### Bước 1: Sửa tên cột trong code (fix ngay)
- `src/pages/UnifiedDashboard.tsx`: Đổi `.select("total_light_score")` → `.select("final_light_score")`
- `src/pages/UnifiedLightScore.tsx`: Tương tự
- `supabase/functions/fun-profile-bridge/index.ts`: Tương tự

### Bước 2: Backfill dữ liệu scoring (cần thêm thời gian)
Để Light Score thực sự > 0, cần đảm bảo pipeline ingest hoạt động đúng:
- Khi user tạo bài viết/chat, sự kiện phải được ghi vào `pplp_events`
- Cron job `pplp-compute-daily-scores` phải chạy để tính toán và ghi vào `light_score_ledger`

Hiện tại chưa có dữ liệu nào trong pipeline, nên dù sửa tên cột thì Light Score vẫn = 0 cho đến khi pipeline bắt đầu ingest events.

## Files thay đổi
1. `src/pages/UnifiedDashboard.tsx` — sửa `total_light_score` → `final_light_score`
2. `src/pages/UnifiedLightScore.tsx` — sửa tương tự  
3. `supabase/functions/fun-profile-bridge/index.ts` — sửa tương tự

