

## Đổi tên sidebar "Kết Nối" → "Chat với Angel AI"

Sửa 1 dòng trong `src/components/MainSidebar.tsx`, dòng 62:

```typescript
// Trước
{ label: t("nav.connect"), href: "/chat", icon: MessageCircle },

// Sau
{ label: "Chat với Angel AI", href: "/chat", icon: MessageCircle },
```

