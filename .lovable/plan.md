

# Thay logo Angel AI mới cho chữ ký và watermark ảnh

## Thay đổi

Thay thế file `public/angel-ai-signature.png` hiện tại bằng logo Angel AI mới (hình tròn vàng gold) mà user vừa upload. Logo này sẽ tự động áp dụng cho:

1. **Chữ ký cuối tin nhắn** (dòng 1180) — đã dùng `/angel-ai-signature.png`
2. **Watermark trên ảnh generated** (dòng 1115) — đã dùng `/angel-ai-signature.png`
3. **Watermark burn-in khi download** (dòng 264) — đã dùng `/angel-ai-signature.png`

Ngoài ra, cần **di chuyển chữ ký vào trong bubble** theo yêu cầu trước đó (từ dòng 1177-1191 xuống trước dòng 1102):
- Xóa block chữ ký ngoài bubble (dòng 1177-1191)
- Chèn chữ ký vào trong bubble (trước `</div>` dòng 1102), kèm logo mới

## Tổng kết

| # | Thay đổi |
|---|----------|
| 1 | Copy logo mới → `public/angel-ai-signature.png` (overwrite) |
| 2 | Di chuyển chữ ký vào trong bubble tin nhắn (Chat.tsx) |

