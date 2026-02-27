

## Kế hoạch: Di chuyển bảng Cộng Đồng Ánh Sáng lên dưới Bảng Danh Dự

**File cần sửa:** `src/pages/Community.tsx`

### Thay đổi:
Trong right sidebar, di chuyển component `<Leaderboard />` từ vị trí gần cuối lên ngay sau `<HonorBoard />` (trước `<CommunityGuidelinesCard />`).

**Thứ tự mới của right sidebar:**
1. HonorBoard (Bảng Danh Dự)
2. **Leaderboard (Cộng Đồng Ánh Sáng)** ← di chuyển lên đây
3. CommunityGuidelinesCard (Nội Quy)
4. GiftHonorBoard
5. DonationHonorBoard
6. GiftTransactionHistory
7. Web3TransactionHistory
8. CirclesSidebar
9. SuggestedFriendsCard
10. RewardRulesCard

