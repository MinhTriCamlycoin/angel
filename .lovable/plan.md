

## Cập nhật Bảng Cộng Đồng Ánh Sáng: Hiển thị hàng ngang + tên dưới ảnh

### Vấn đề hiện tại
Bảng đang hiển thị dạng **grid 3 cột** (lưới). Con muốn chuyển về dạng **hàng ngang cuộn được** (horizontal scroll) và giữ tên hiển thị dưới ảnh đại diện.

### Thay đổi

**1. `src/components/Leaderboard.tsx`** — Đổi grid → horizontal scroll
- Thay `grid grid-cols-3` thành `flex overflow-x-auto` với snap scrolling
- Mỗi card có chiều rộng cố định (~90px) để hiển thị đều trên hàng ngang
- Ẩn scrollbar cho gọn, hỗ trợ vuốt ngang trên mobile

**2. `src/components/leaderboard/RankingRow.tsx`** — Giữ layout dọc (avatar → tên → badge)
- Giữ nguyên cấu trúc hiện tại: avatar trên, tên dưới, badge dưới cùng
- Đảm bảo chiều rộng card cố định để hàng ngang đều đẹp trên mọi thiết bị

### Kết quả
Bảng sẽ hiển thị 1 hàng ngang vuốt được, mỗi thành viên là 1 card nhỏ (avatar + tên + level badge), hoạt động đồng nhất trên mobile và desktop.

