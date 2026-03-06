

# Strip Markdown khi Copy tin nhắn Angel AI

## Vấn đề

Khi user nhấn nút **Copy** trong chat, hàm `handleCopyMessage` copy nguyên `message.content` (chứa markdown `**bold**`, `*italic*`, `###`...) vào clipboard. Khi paste lên Facebook/Telegram, các ký tự `*` hiện ra rối mắt.

Hiện tại `stripMarkdown` đã được dùng để **hiển thị** text sạch trên UI, nhưng **chưa được áp dụng khi copy**.

## Giải pháp

Sửa 1 dòng trong `src/pages/Chat.tsx`:

**Hàm `handleCopyMessage` (dòng ~191-198):** Áp dụng `stripMarkdown` trước khi copy vào clipboard.

```typescript
// Trước:
await navigator.clipboard.writeText(content);

// Sau:
await navigator.clipboard.writeText(stripMarkdown(content));
```

Chỉ cần sửa 1 dòng duy nhất. `stripMarkdown` đã được import sẵn trong file.

## Kết quả

- Copy → Paste lên Facebook: text thường, sạch sẽ, không có dấu `*`
- Copy → Paste lên Telegram: text thường, sạch sẽ
- Hiển thị trong app: vẫn giữ nguyên (đã strip sẵn)

