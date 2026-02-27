

## Kế hoạch: Thêm trang Admin Whitelist & Blacklist

### Trang mới: `/admin/trust-list`
Tạo trang `AdminTrustList.tsx` với 2 tab:

**Tab 1 - Whitelist (Danh sách trắng)**
- Hiển thị dữ liệu từ bảng `fraud_whitelist`
- Cột: Tên user, Lý do whitelist, Người xác nhận, Ngày thêm
- Join với `profiles` để lấy display_name, avatar

**Tab 2 - Blacklist (Nghi gian lận)**
- Hiển thị dữ liệu từ bảng `pplp_fraud_signals` WHERE `is_resolved = false`
- Group theo `actor_id`, đếm số signals
- Cột: Tên user, Loại tín hiệu, Mức nghiêm trọng, Lý do chi tiết (từ `details`), Ngày phát hiện
- Join với `profiles` để lấy display_name, avatar

### Cập nhật routing & navigation
1. **App.tsx**: Thêm route `/admin/trust-list` → `AdminTrustList`
2. **AdminNavToolbar.tsx**: Thêm link "Whitelist/Blacklist" vào nhóm "Quản lý" với icon `ShieldCheck`

