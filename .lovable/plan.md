

## Kế hoạch sáp nhập Angel AI + FUN Profile

### Bối cảnh
Angel AI (angel.fun.rich) và FUN Profile (fun.rich) hiện là 2 dự án Lovable **riêng biệt** với database riêng. Việc "sáp nhập" thực chất là tạo **cầu nối liên kết (Bridge)** giữa 2 nền tảng, vì mỗi project có backend riêng.

### Giới hạn kỹ thuật quan trọng
- Angel AI **không thể truy cập trực tiếp** database của FUN Profile và ngược lại
- Để chia sẻ dữ liệu (Light Score, History, Dashboard), cần **Bridge API** (Edge Functions gọi qua HTTP giữa 2 project)
- Auth thống nhất cần cả 2 project cùng cấu hình

---

### 1. Thêm "FUN Profile" vào Left Sidebar

**Vị trí**: Ngay trên "Cộng đồng" trong `MainSidebar.tsx`

- Thêm icon FUN Profile (dùng `Globe` hoặc icon riêng)
- Logic: Nếu user đã có `handle` trong profiles -> link đến `https://fun.rich/@{handle}`
- Nếu chưa có handle -> link đến `https://fun.rich`
- Click sẽ mở tab mới (`window.open`)

### 2. Redirect Mint FUN sang FUN Profile

**File**: Trang `/mint` hiện tại

- Thay vì hiển thị giao diện mint nội bộ, redirect user đến `https://fun.rich/wallet/fun_money`
- Giữ nguyên trang mint cũ như một fallback hoặc hiển thị thông báo "Chuyển đến FUN Profile để mint"

### 3. Redirect Auth sang FUN Profile

**File**: Trang `/auth`

- Thêm option "Đăng ký qua FUN Profile" -> redirect đến `https://fun.rich/auth`
- Sau khi đăng ký trên fun.rich, user quay lại Angel AI với cross-domain auth flow (tương tự Google OAuth redirect chain đã có)
- Giữ nguyên auth hiện tại của Angel AI như phương án song song

### 4. Bảng Light Score chung (Cross-Platform)

**Tạo mới**: `src/pages/UnifiedLightScore.tsx`

- Dashboard hiển thị Light Score từ **cả 2 platform**
- Gọi Edge Function bridge để lấy dữ liệu từ FUN Profile
- Hiển thị: LS trên Angel AI (local DB) + LS trên FUN Profile (qua API) = Tổng LS
- Bảng history gộp từ cả 2 nguồn, sắp xếp theo thời gian

### 5. Dashboard tổng chung

**Tạo mới**: `src/pages/UnifiedDashboard.tsx`

- Route: `/unified-dashboard`
- Hiển thị tổng quan từ cả 2 platform:
  - Tổng Light Score (Angel AI + FUN Profile)
  - Tổng FUN đã mint
  - Tổng hoạt động (posts, chats, interactions)
  - So sánh hoạt động giữa 2 platform
- Thêm vào sidebar và admin navigation

### 6. Edge Function Bridge API

**Tạo mới**: `supabase/functions/fun-profile-bridge/index.ts`

- Endpoint trung gian để giao tiếp với FUN Profile API
- Các chức năng:
  - `GET /light-score?user_id=...` - Lấy LS từ FUN Profile
  - `GET /activity-history?user_id=...` - Lấy history từ FUN Profile
  - `GET /dashboard-stats?user_id=...` - Lấy thống kê tổng
- Xác thực qua shared JWT hoặc API key giữa 2 project

### 7. Bảng `fun_id_links` (Database)

Migration tạo bảng liên kết ID giữa 2 platform:

```text
fun_id_links
- id (uuid, PK)
- angel_user_id (uuid, FK -> auth.users)
- fun_profile_user_id (text) -- ID bên FUN Profile
- wallet_address (text) -- ví chung
- linked_at (timestamptz)
- status (text: active/pending)
```

---

### Tóm tắt thay đổi

| Thành phần | Hành động |
|---|---|
| `MainSidebar.tsx` | Thêm "FUN Profile" link trước Community |
| `/mint` page | Redirect đến fun.rich/wallet/fun_money |
| `/auth` page | Thêm option đăng ký qua fun.rich |
| `UnifiedLightScore.tsx` | Trang mới: LS chung 2 platform |
| `UnifiedDashboard.tsx` | Trang mới: Dashboard tổng hợp |
| Edge Function `fun-profile-bridge` | API bridge giao tiếp FUN Profile |
| DB migration | Tạo bảng `fun_id_links` |
| Sidebar + Routes | Thêm navigation items mới |

### Lưu ý
- Tất cả bảng/trang hiện tại được **giữ nguyên** (chỉ thêm, không bớt)
- FUN Profile (fun.rich) cũng cần cấu hình tương ứng để nhận API calls từ Angel AI
- Cross-domain auth cần cả 2 bên cùng triển khai

