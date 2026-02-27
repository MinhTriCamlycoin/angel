

# Chuyển đổi Bảng Xếp Hạng → Bảng Light Community (Không Ego)

## Phân tích hiện trạng

Hiện tại Angel AI có **3 bảng xếp hạng** sử dụng mô hình cạnh tranh (Top 1-2-3, hiển thị Camly Coin):

1. **Leaderboard chính** (`src/components/Leaderboard.tsx` + `TopRankingHero.tsx` + `RankingRow.tsx`): Xếp hạng theo `lifetime_earned` Camly Coin, hiển thị Top 5 với pedestal vàng
2. **DonationHonorBoard** (`src/components/community/DonationHonorBoard.tsx`): Xếp hạng người tặng coin theo số lượng
3. **GiftHonorBoard** (`src/components/community/GiftHonorBoard.tsx`): Xếp hạng tặng quà

Tất cả đều vi phạm nguyên tắc "Không nuôi Ego" đã thiết lập trong PPLP v3.

## Thay đổi chính

### 1. Chuyển Leaderboard chính → Light Community Board

**Thay đổi:**
- Đổi title "TOP XẾP HẠNG" → "CỘNG ĐỒNG ÁNH SÁNG" / "LIGHT COMMUNITY"
- Xóa bỏ xếp hạng 1-2-3-4-5 (pedestal, rank number)
- Không hiển thị Camly Coin số cụ thể
- Thay bằng: hiển thị avatar + tên + **Light Level Badge** (Presence/Contributor/Builder/Guardian/Architect) + **Trend** (Growing/Stable/Reflecting)
- Giữ thống kê tổng (Tổng thành viên, Tổng coin hệ thống) vì đây là thông tin hệ sinh thái
- Bỏ nút "Xem thêm" danh sách xếp hạng mở rộng

**Files cần sửa:**
- `src/components/Leaderboard.tsx` — Bỏ logic xếp hạng, hiển thị community members với Light Level
- `src/components/leaderboard/TopRankingHero.tsx` — Thay hoàn toàn: bỏ pedestal/rank/coin, thay bằng grid hiển thị thành viên nổi bật với Light Level badge
- `src/components/leaderboard/RankingRow.tsx` — Bỏ rank number + coin amount, thay bằng Light Level + Trend
- `src/components/leaderboard/RainbowTitle.tsx` — Giữ nguyên component, đổi text truyền vào
- `src/hooks/useLeaderboard.ts` — Bổ sung fetch Light Level cho mỗi user thay vì chỉ sort theo coin

### 2. Cập nhật DonationHonorBoard

- Bỏ xếp hạng 1-2-3, bỏ rank badge
- Chuyển thành "Bảng Tri Ân" — chỉ hiển thị danh sách người đóng góp không theo thứ tự cạnh tranh
- Bỏ dialog "Xem tất cả xếp hạng" với rank number

**File:** `src/components/community/DonationHonorBoard.tsx`

### 3. Cập nhật GiftHonorBoard tương tự

**File:** `src/components/community/GiftHonorBoard.tsx`

### 4. Cập nhật translations

- Đổi key `leaderboard.topRanking` từ "TOP XẾP HẠNG" → "CỘNG ĐỒNG ÁNH SÁNG"
- Thêm keys mới cho Light Level labels
- Cập nhật trong tất cả 12 ngôn ngữ

### 5. Cập nhật báo cáo

- `src/data/reportData.ts` — Đổi mô tả tính năng "Bảng xếp hạng"

## Chi tiết kỹ thuật

### Database
- Sử dụng RPC `get_user_light_level` đã có sẵn
- Cần tạo RPC mới `get_community_light_summary` để fetch Light Level cho nhiều user cùng lúc (thay vì gọi từng user)

### UI mới cho Light Community Board
Thay vì Top 1-2-3 pedestal, hiển thị:
- Grid 2-3 cột các thành viên tích cực
- Mỗi thành viên: Avatar + Tên + Light Level icon + Trend arrow
- Không số thứ tự, không số coin cụ thể
- Random/shuffle thứ tự hiển thị mỗi lần load để không tạo cảm giác xếp hạng

