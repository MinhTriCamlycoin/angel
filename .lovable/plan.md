

## Thiết kế lại Light Actions theo dạng lưới tháng

### Vấn đề hiện tại
Mỗi action hiển thị dạng card lớn (chiếm ~200px chiều cao) với đầy đủ thông tin (5 pillars, progress bar, reward, button). Khi user có 50+ actions, trang rất dài và khó tổng quan.

### Thiết kế mới: Monthly Grid View

**Layout tổng quan:**
- Nhóm actions theo tháng (Tháng 3/2026, Tháng 2/2026...)
- Mỗi tháng là 1 section collapsible, tháng hiện tại mở sẵn
- Trong mỗi tháng: hiển thị dạng bảng lưới compact

**Bảng lưới cho mỗi tháng:**

```text
┌──────────────────────────────────────────────────────────┐
│ 📅 Tháng 3/2026          42 actions  │ Tổng: +4,200 FUN │
├──────┬──────────┬───────┬───────┬────────┬──────────────┤
│ Ngày │ Loại     │ Score │ S T H │ Reward │ Trạng thái   │
├──────┼──────────┼───────┼───────┼────────┼──────────────┤
│ 01/3 │ Hỏi AI   │ 83.9  │ ●●●●● │ +95    │ ✅ Đã mint   │
│ 01/3 │ Nhật ký  │ 79.2  │ ●●●●○ │ +88    │ ✅ Đã mint   │
│ 02/3 │ Đăng bài │ 91.0  │ ●●●●● │ +102   │ ⏳ Đang xử lý│
└──────┴──────────┴───────┴───────┴────────┴──────────────┘
```

**Chi tiết thiết kế:**
1. **Header tháng**: Tên tháng + tổng số actions + tổng FUN reward, collapsible
2. **Hàng compact**: Mỗi action là 1 row ~40px thay vì card 200px
   - Ngày (dd/MM)
   - Loại action (icon + label ngắn)
   - Light Score (số + mini progress bar)
   - 5 Pillars dạng 5 chấm tròn nhỏ màu (thay vì grid 5 ô)
   - Reward (+FUN)
   - Badge trạng thái nhỏ
3. **Click vào row** → expand hiển thị chi tiết (pillars đầy đủ, tx hash, BSCScan link)
4. **Mobile**: Ẩn bớt cột (Score, Pillars), giữ Ngày + Loại + Reward + Status

### Files cần sửa
1. **`src/components/mint/MintActionsList.tsx`** — Nhóm actions theo tháng, render grid thay vì cards
2. **`src/components/mint/FUNMoneyMintCard.tsx`** — Thêm variant compact (row) bên cạnh card view hiện tại, hoặc tạo component mới `MintActionRow.tsx`

### Approach
- Tạo component mới `MintActionRow.tsx` cho dạng hàng compact
- Tạo component `MonthlyActionsGroup.tsx` để nhóm + collapsible theo tháng
- Cập nhật `MintActionsList.tsx` để group actions by month và render dạng mới
- Giữ nguyên stats cards và epoch banner ở trên

