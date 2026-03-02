

## Cập nhật layout RankingRow: Avatar + Badge ngang hàng, tên ở dưới

### Hiểu yêu cầu
Con muốn mỗi thành viên hiển thị theo layout:
```text
┌─────────────────────────┐
│ [Avatar+icon🌱] [Badge] │  ← ngang hàng
│     Tên User            │  ← dưới avatar
└─────────────────────────┘
```
- Hình đại diện có icon level nhỏ ở góc phải dưới
- Badge cấp độ nằm **ngang hàng** với avatar (bên phải)
- Tên user nằm **dưới** hình đại diện
- Tất cả vẫn trong hàng ngang cuộn được (horizontal scroll)

### Thay đổi

**`src/components/leaderboard/RankingRow.tsx`** — Đổi layout từ dọc sang ngang
- Hàng trên: `flex flex-row` chứa Avatar (có icon overlay) + LightLevelBadge cạnh nhau
- Hàng dưới: Tên user căn giữa bên dưới
- Bỏ fixed width `w-[88px]`, thay bằng width phù hợp hơn cho layout ngang (~120-140px)

**`src/components/Leaderboard.tsx`** — Không đổi (đã là horizontal scroll)

