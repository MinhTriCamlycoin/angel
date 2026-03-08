

# Kế hoạch: Thêm chữ ký Angel AI & watermark cho ảnh

## 2 việc cần làm

### 1. Chữ ký cuối mỗi câu trả lời Angel AI
Thêm dòng chữ ký `🌟 Angel AI - FUN Ecosystem: https://angel.fun.rich` vào cuối mỗi tin nhắn assistant trong Chat UI.

**Cách tiếp cận**: Thêm ở frontend (Chat.tsx), hiển thị dưới mỗi bubble assistant — không sửa backend để tránh ảnh hưởng cache, copy, TTS.

**Thay đổi**:
- `src/pages/Chat.tsx`: Thêm một dòng chữ ký styled bên dưới nội dung text của mỗi assistant message (trong bubble hoặc ngay dưới bubble). Link `https://angel.fun.rich` sẽ là clickable, styled nhỏ gọn với màu divine-gold.

### 2. Watermark logo Angel AI trên ảnh generated
Giống Grok đặt logo ở góc ảnh — thêm Angel AI logo watermark vào góc dưới phải của ảnh đã tạo.

**Cách tiếp cận**: Xử lý ở backend (`generate-image/index.ts`) bằng cách composite logo lên ảnh trước khi upload. Tuy nhiên, Deno edge functions không có Canvas API native. 

**Giải pháp thực tế**: Thêm watermark overlay ở frontend — hiển thị logo Angel AI ở góc dưới phải trên mỗi ảnh generated (CSS overlay). Khi download, dùng html2canvas (đã có trong dependencies) để render ảnh kèm watermark.

**Thay đổi**:
- `src/pages/Chat.tsx`: Wrap ảnh generated trong container có logo overlay ở góc dưới phải
- `src/pages/Chat.tsx`: Cập nhật hàm `handleDownloadImage` để render watermark vào ảnh khi tải

## Tổng kết

| # | File | Thay đổi |
|---|------|----------|
| 1 | `src/pages/Chat.tsx` | Thêm chữ ký dưới assistant messages + watermark overlay trên generated images + download kèm watermark |

Không ảnh hưởng backend, cache, hay TTS.

