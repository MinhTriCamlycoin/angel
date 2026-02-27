

## Kế hoạch: Thêm chức năng chuyển WL ↔ BL và cải thiện hiển thị lý do

### 1. Cập nhật `AdminTrustList.tsx`

**Thêm nút hành động cho mỗi tab:**
- **Tab Whitelist**: Thêm cột "Thao tác" với nút "Chuyển sang BL" — khi bấm sẽ:
  - Xóa user khỏi `fraud_whitelist`
  - Tạo fraud signal mới trong `pplp_fraud_signals` với lý do admin nhập (dialog nhập lý do)
  - Reload data

- **Tab Blacklist**: Thêm cột "Thao tác" với nút "Chuyển sang WL" — khi bấm sẽ:
  - Thêm user vào `fraud_whitelist` với lý do admin nhập
  - Resolve tất cả fraud signals chưa xử lý của user đó
  - Reload data

**Cải thiện cột "Lý do" trong Blacklist:**
- Dịch `signal_type` sang tiếng Việt: `SYBIL` → "Nghi tài khoản giả", `BOT` → "Nghi bot tự động", `SPAM` → "Spam"
- Parse `details` JSON để hiển thị rõ ràng bằng tiếng Việt (VD: "Trùng IP với 3 tài khoản khác", "Trùng device fingerprint")

**Dialog xác nhận:**
- Dùng `AlertDialog` với `Textarea` để admin nhập lý do trước khi chuyển

### 2. Đảm bảo WL không tự động chuyển sang BL
- Logic này đã được xử lý trong `anti-sybil.ts` (kiểm tra whitelist trước khi tạo signal) — không cần sửa thêm

### Chi tiết kỹ thuật
- Sử dụng các component có sẵn: `AlertDialog`, `Button`, `Textarea`
- Lấy admin user ID từ session hiện tại để ghi `whitelisted_by` / `resolved_by`
- Chỉ sửa file `src/pages/AdminTrustList.tsx`

