

## Plan: Tạo bảng cấp độ Light sang trọng trong trang Cộng Đồng

### Dữ liệu thực tế từ database (`pplp_light_levels`)

| Level | Icon | Name VI | Name EN | Score Range | Color |
|-------|------|---------|---------|-------------|-------|
| 1 | 🌱 | Hiện diện tích cực | Light Presence | 0 – 199 | #8BC34A |
| 2 | 🌟 | Người tạo giá trị | Light Contributor | 200 – 499 | #FFC107 |
| 3 | 🔨 | Người xây dựng | Light Builder | 500 – 999 | #FF9800 |
| 4 | 🛡️ | Người bảo vệ | Light Guardian | 1,000 – 1,999 | #2196F3 |
| 5 | 👑 | Người thiết kế | Light Architect | 2,000+ | #9C27B0 |

### Thiết kế component

Tạo component `LightLevelsTable` hiển thị ngay phía trên danh sách thành viên trong trang `/light-community`, với thiết kế:

- **Header**: Tiêu đề "Các Cấp Độ Ánh Sáng" / "Light Levels" (đa ngôn ngữ)
- **5 hàng card ngang** cho mỗi cấp độ, mỗi hàng gồm:
  - Biểu tượng emoji lớn (icon) với viền gradient theo màu cấp độ
  - Tên cấp độ (VI + EN) in đậm, màu theo level color
  - Thanh progress bar thể hiện khoảng điểm (min → max)
  - Hiển thị rõ khoảng điểm: "0 – 199 LS"
- **Phong cách**: Gradient nền nhẹ từ màu cấp độ, border mềm, shadow tinh tế, bo tròn 2xl
- **Collapsible**: Mặc định thu gọn, nhấn để mở rộng (tiết kiệm không gian mobile)

### Các file thay đổi

1. **Tạo mới**: `src/components/leaderboard/LightLevelsTable.tsx`
   - Component hiển thị 5 cấp độ với thiết kế sang trọng
   - Dữ liệu hardcode từ database (static, không cần fetch vì hiếm khi thay đổi)
   - Hỗ trợ đa ngôn ngữ qua `useLanguage`
   - Sử dụng Collapsible từ Radix UI

2. **Sửa**: `src/pages/LightCommunity.tsx`
   - Import và đặt `LightLevelsTable` giữa subtitle và danh sách thành viên

3. **Sửa**: `src/translations/vi.ts` + `en.ts` (và 10 ngôn ngữ còn lại)
   - Thêm key `lightLevels.title`, `lightLevels.scoreRange`, `lightLevels.showLevels`, `lightLevels.hideLevels`

