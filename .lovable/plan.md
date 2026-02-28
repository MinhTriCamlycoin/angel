

## Đổi tất cả "Kết Nối" → "Chat với Angel AI"

Có **2 nơi hiển thị** mục navigation này cần sửa:

### 1. Header (desktop/mobile) — `src/components/Header.tsx` dòng 127
```typescript
// Trước
{ label: t("nav.connect"), href: "/chat", icon: MessageCircle },
// Sau
{ label: "Chat với Angel AI", href: "/chat", icon: MessageCircle },
```

### 2. Tất cả 12 file ngôn ngữ — cập nhật `nav.connect`
Đổi giá trị `nav.connect` trong mỗi file translation thành "Chat với Angel AI":
- `src/translations/vi.ts` — "Kết Nối" → "Chat với Angel AI"
- `src/translations/en.ts` — "Connect" → "Chat với Angel AI"
- `src/translations/zh.ts`, `es.ts`, `ar.ts`, `hi.ts`, `pt.ts`, `ru.ts`, `ja.ts`, `de.ts`, `fr.ts`, `ko.ts` — tương tự

**Lưu ý**: Sidebar (`MainSidebar.tsx`) đã được sửa ở bước trước. Không cần thay đổi gì thêm.

