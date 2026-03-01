

## Kế hoạch: Phân tách rõ "Điểm tháng này" vs "Tích lũy" trong frontend

### Vấn đề hiện tại
- `useLightPoints.ts` dòng 94: `getLevelInfo(lifetimePoints)` — tính level từ điểm tích lũy
- `LightPointsDisplay.tsx` dòng 9: `getLevelInfo(totalPoints)` — tính level từ điểm tháng
- Hai chỗ dùng khác nhau → không nhất quán
- UI đã hiển thị cả 2 giá trị nhưng progress bar và level title bị lẫn lộn

### Thay đổi

**1. `src/hooks/useLightPoints.ts`**
- Thêm field `monthlyLevel` (từ `totalPoints`) và `lifetimeLevel` (từ `lifetimePoints`) vào interface
- Dòng 94: giữ `currentLevel` dựa trên `lifetimePoints` (cấp bậc dài hạn)
- Export thêm `monthlyLevelInfo` để UI dùng cho progress bar tháng

**2. `src/components/LightPointsDisplay.tsx`**
- Header: hiển thị **lifetime level title** (cấp bậc tích lũy dài hạn)
- Số lớn: hiển thị `totalPoints` với label "⭐ Điểm tháng 3"
- Dòng nhỏ: hiển thị `lifetimePoints` với label "🏆 Tổng tích lũy"
- Progress bar: dùng `totalPoints` cho tiến trình tháng này
- Thêm progress bar thứ 2 nhỏ hơn cho lifetime level nếu cần

**3. `src/components/public-profile/PublicProfileStats.tsx`**
- Không thay đổi (đã dùng dữ liệu riêng từ `usePublicProfile`)

### Chi tiết kỹ thuật

```text
Hook output:
  totalPoints     → điểm tháng này (reset mỗi tháng)
  lifetimePoints  → điểm tích lũy (không bao giờ reset)
  currentLevel    → level từ lifetimePoints (cấp bậc vĩnh viễn)

Display:
  ┌─────────────────────────────────────┐
  │ 🌟 Level 3 - Ngọn Đèn (tích lũy)  │
  │                          0 ⭐       │
  │                    Điểm tháng 3     │
  │              Tích lũy: 350 🏆       │
  ├─────────────────────────────────────┤
  │ Tiến trình tháng: 0 / 100 (Lv.2)   │
  │ ████░░░░░░░░░░░░░░░░░░░░ 0%        │
  └─────────────────────────────────────┘
```

2 files cần sửa, không cần thay đổi database.

