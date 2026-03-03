

## Thiết kế lại Cộng Đồng Ánh Sáng — Lưới cuộn dọc

### Phân tích hiện trạng
- `Leaderboard.tsx`: Hiển thị horizontal scroll, dùng `RankingRow` với card `w-[140px]`
- `RankingRow.tsx`: Card ngang (avatar + badge cùng hàng, tên bên dưới)
- `LightCommunity.tsx` (trang full list): Hiển thị danh sách dọc với Light Score, LS points chi tiết

### Thay đổi cần làm

#### 1. Cập nhật `Leaderboard.tsx` — Chuyển sang grid cuộn dọc
- Thay `flex overflow-x-auto` thành `grid grid-cols-3` (hoặc 2 trên mobile)
- Hiển thị tối đa 6 user (2 hàng x 3 cột)
- Giữ nguyên style gold Angel AI (border, shadow, gradient)
- Nút "Xem thêm" vẫn navigate đến `/light-community`

#### 2. Cập nhật `RankingRow.tsx` — Avatar trên, tên dưới (centered)
- Layout: Avatar ở giữa trên, tên user căn giữa bên dưới
- Light level badge nhỏ nằm overlay góc avatar (không chiếm dòng riêng)
- Handle `@username` hiển thị dưới tên
- Giữ gold border + hover effects

#### 3. Cập nhật `LightCommunity.tsx` — Ẩn điểm Light Score
- Chuyển từ list sang **grid cuộn dọc** (3 cột desktop, 2 cột mobile)
- Card giống `RankingRow` nhưng lớn hơn: avatar centered + tên dưới + handle
- **Ẩn hoàn toàn**: Light Level Badge, LS points (`⚡ xxx LS`), trend icon
- Chỉ hiển thị: avatar, light icon nhỏ overlay, tên, handle
- Giữ nguyên `LightLevelsTable` ở trên

### Tóm tắt files thay đổi

| File | Thay đổi |
|---|---|
| `src/components/Leaderboard.tsx` | `flex overflow-x-auto` → `grid grid-cols-3 gap-2` |
| `src/components/leaderboard/RankingRow.tsx` | Avatar centered trên, tên centered dưới |
| `src/pages/LightCommunity.tsx` | Grid layout, ẩn LightLevelBadge + LS score |

