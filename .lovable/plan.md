

## Kế hoạch: Thiết kế lại CelebrationPostCard

**Files cần sửa:**
1. `src/components/community/CelebrationPostCard.tsx` - Thiết kế lại hoàn toàn
2. `src/components/gifts/GiftCoinDialog.tsx` - Đổi text "Cùng chung tay xây dựng cộng đồng yêu thương" thành "ANGEL AI, LAN TOẢ YÊU THƯƠNG"

### Thay đổi chi tiết:

#### 1. CelebrationPostCard.tsx - Redesign
- **Thêm hiệu ứng đồng tiền rơi (FallingCoin)** giống WithdrawalCelebration popup: đồng Camly Coin rơi từ trên xuống, xoay 360°, ~15-20 đồng
- **Thêm hiệu ứng pháo bông (FireworkBurst)** mạnh hơn, giống popup thành công: nhiều tia pháo hoa hơn, nhiều màu sắc
- **Tự động phát nhạc khi lướt qua**: Sử dụng IntersectionObserver để detect khi card xuất hiện trong viewport → tự động play `/audio/rich-1.mp3`, chỉ play 1 lần, tự tắt khi kết thúc (không loop)
- **Đổi nội dung footer**: "🌟 Cùng chung tay xây dựng cộng đồng yêu thương!" → "✨ ANGEL AI, LAN TOẢ YÊU THƯƠNG ✨" hiển thị trong card với style nổi bật

#### 2. GiftCoinDialog.tsx - Đổi nội dung bài đăng tự động
- Dòng 261: Đổi `🌟 Cùng chung tay xây dựng cộng đồng yêu thương!` → `✨ ANGEL AI, LAN TOẢ YÊU THƯƠNG ✨`

#### Auto-play audio logic:
- Dùng `useRef` + `IntersectionObserver` với threshold 0.5
- Khi card hiện 50%+ trong viewport → play audio 1 lần
- Track `hasPlayed` để không phát lại khi scroll qua lại
- Audio ngắn (file rich-1.mp3 sẵn có), tự tắt khi hết

