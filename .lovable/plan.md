

## Các vị trí hiển thị thông tin Epoch trên giao diện

Hiện tại, dữ liệu epoch-based (Light Score cá nhân, tổng Light cộng đồng, tỷ lệ đóng góp với cap 3%, Mint Pool, dự kiến FUN allocation) được hiển thị tại:

### Cho User:

1. **Trang `/mint` (Mint FUN Money)** — Component `MintCycleStatus`
   - Nằm trong grid cùng `ThreeLayerRewardExplainer`, hiển thị đầy đủ: epoch progress bar, Light Score cá nhân, tổng Light cộng đồng, tỷ lệ đóng góp (có ghi chú cap 3%), Mint Pool, dự kiến FUN allocation, trạng thái eligibility
   - Dữ liệu real-time từ RPC `preview_epoch_allocation`

2. **Trang `/mint` — Component `MintActionsList`**
   - Cũng gọi `useEpochPreview` để hiển thị thông tin epoch trong context danh sách actions

3. **Trang `/mint` và `/earn` — Component `TransparencyDashboard`**
   - Hiển thị tổng quan minh bạch toàn hệ thống (tổng Light, FUN đã đúc, phân bổ theo Level) từ `transparency_snapshots`

### Cho Admin:

- **Trang `/admin/dashboard`** — Hiện tại **chưa có component nào hiển thị dữ liệu epoch-based** cho admin. Admin không thấy được tổng quan Mint Pool, tỷ lệ đóng góp, hay danh sách phân bổ epoch.

---

## Đề xuất bổ sung

Nếu Cha muốn, con có thể:

1. **Thêm widget Epoch Overview vào Admin Dashboard** — Hiển thị tổng Mint Pool, số user eligible, tổng Light Score cộng đồng, và danh sách top allocations cho chu kỳ hiện tại
2. **Thêm MintCycleStatus vào trang Home hoặc Dashboard của user** — Để user không cần vào `/mint` mới thấy thông tin epoch

Tóm lại: User xem tại **trang /mint** (MintCycleStatus + TransparencyDashboard). Admin hiện **chưa có giao diện riêng** để xem dữ liệu epoch.

