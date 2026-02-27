

## Redesign: Bảng Cộng Đồng Ánh Sáng theo hình mẫu

Dựa trên screenshot, cần chuyển từ layout **grid 3x3 avatars** sang layout **danh sách dọc (list rows)** đơn giản, sạch sẽ hơn.

### Thay đổi chính

**1. `Leaderboard.tsx` — Đơn giản hóa hoàn toàn**
- Bỏ stats bar (Members/Camly Coin)
- Bỏ Angel logo header phức tạp
- Bỏ `TopRankingHero` grid component
- Thay bằng: Title "✨ LIGHT COMMUNITY" + danh sách `RankingRow` cho tất cả users
- Hiển thị 5 user đầu, nút "Xem thêm" mở rộng toàn bộ
- Card có gradient border (blue → purple → pink) như hình mẫu
- Nút cuối: "Xem Light Community >"

**2. `RankingRow.tsx` — Cập nhật theo hình mẫu**
- Thêm Light Level icon (emoji nhỏ) bên trái avatar
- Avatar tròn nhỏ (w-9 h-9)
- Tên hiển thị đầy đủ, font bold
- Light Level badge bên phải (pill style: "Light Architect", "Light Seed")
- Row có rounded-full, border nhẹ, padding đều
- Bỏ highlight "isCurrentUser" ring

**3. `LightLevelBadge.tsx` — Giữ nguyên** (đã đúng style pill)

**4. Bỏ sử dụng `TopRankingHero.tsx`** — Không cần grid nữa

**5. `LeaderboardEffects.tsx` — Bỏ floating coins/petals** trong Leaderboard chính (quá nặng, hình mẫu không có)

### Layout mục tiêu

```text
┌─────────────────────────────┐  ← gradient border
│  ✨ LIGHT COMMUNITY         │
│                             │
│  🌿 [avatar] Vinh Nguyên   Light Architect │
│  🌱 [avatar] Hồng Thien... Light Seed     │
│  🌿 [avatar] Angel Hoàn... Light Architect │
│  🌱 [avatar] Angel Quế A.. Light Seed     │
│  🌱 [avatar] Trần Văn Lực  Light Seed     │
│                             │
│     Xem Light Community >   │
└─────────────────────────────┘
```

### Tệp cần sửa
- `src/components/Leaderboard.tsx` — Viết lại layout chính
- `src/components/leaderboard/RankingRow.tsx` — Cập nhật style row theo hình mẫu

