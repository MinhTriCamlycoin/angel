

# Sửa copy kèm logo Angel AI chính thức

## Vấn đề
1. **Logo asset** (`src/assets/angel-ai-logo.png`) chưa đúng logo chính thức (file `1-2.png` user đã upload)
2. **Nút Copy** chỉ copy plain text `🌟 Angel AI — FUN Ecosystem` — không có logo hình ảnh

## Thay đổi

### 1. Thay file logo
Ghi đè `src/assets/angel-ai-logo.png` bằng file `1-2.png` (logo tròn vàng chính thức). Tự động cập nhật toàn bộ nơi sử dụng (chữ ký bubble, watermark ảnh, sidebar, auth, about...).

### 2. Nút Copy gửi rich text kèm logo (ClipboardItem API)
Sửa `handleCopyMessage` trong `src/pages/Chat.tsx` (dòng 192-203):

**Cách hoạt động mới:**
- Tạo HTML string chứa nội dung tin nhắn + chữ ký có `<img>` tag trỏ đến logo (URL tuyệt đối: `https://angel999.lovable.app/angel-ai-logo.png`)
- Dùng `navigator.clipboard.write()` với `ClipboardItem` chứa cả `text/html` và `text/plain`
- **Fallback**: nếu trình duyệt không hỗ trợ `ClipboardItem`, copy plain text kèm `🌟 Angel AI — FUN Ecosystem` (giữ nguyên như hiện tại)

### 3. Copy file logo ra public folder
Copy `src/assets/angel-ai-logo.png` → `public/angel-ai-logo.png` để có URL tuyệt đối cho HTML clipboard (vì asset trong `src/assets` sẽ bị hash khi build, không ổn định cho external paste).

### File cần sửa
| File | Thay đổi |
|------|----------|
| `src/assets/angel-ai-logo.png` | Ghi đè bằng logo chính thức `1-2.png` |
| `public/angel-ai-logo.png` | Copy logo chính thức vào public folder |
| `src/pages/Chat.tsx` (dòng 192-203) | Sửa `handleCopyMessage` dùng ClipboardItem API với rich text HTML |

