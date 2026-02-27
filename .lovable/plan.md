

## Kế hoạch: Avatar link + hiển thị username

### Sửa `src/pages/AdminTrustList.tsx`

**1. Cập nhật fetch profiles** — thêm field `handle` vào select query cho cả whitelist và blacklist.

**2. Cập nhật interfaces** — thêm `handle?: string | null` vào profile type trong `WhitelistEntry` và `BlacklistGroup`.

**3. Avatar trở thành link** — Bọc Avatar + tên user trong `<Link>` sử dụng `getProfilePath(userId, handle)` từ `src/lib/profileUrl.ts`. Nhấp vào avatar/tên sẽ chuyển đến trang profile.

**4. Hiển thị username dưới tên** — Thêm dòng `@handle` (nếu có) hoặc `userId.slice(0,8)` dưới display_name với style `text-xs text-muted-foreground`.

Áp dụng cho cả 2 tab (Whitelist và Blacklist).

