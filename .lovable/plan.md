
Mình đã kiểm tra lại code hiện tại và xác nhận lỗi đang nằm ở bước map dữ liệu identity trong backend login bridge của Angel AI.

## Chẩn đoán hiện tại

- `AuthCallback.tsx` đang gọi:
  1) `funProfile.handleCallback(code, state)` để lấy `accessToken`
  2) gửi `fun_access_token` sang backend function `bridge-login`
- `bridge-login` gọi `.../sso-verify` rồi **bắt buộc** đọc `identity.email` (top-level).
- Nếu email không nằm ở top-level (ví dụ ở `identity.user.email`) thì function trả lỗi:
  `No email in FUN Profile identity`  
  (đúng với màn hình bạn gửi).

## Kế hoạch triển khai (Angel AI)

1) Chuẩn hóa identity payload trong `bridge-login`
- Thêm bước normalize trước khi xử lý user:
  - `email` lấy lần lượt từ:
    - `identity.email`
    - `identity.user?.email`
    - `identity.profile?.email` (nếu có)
  - `funUserId` lấy từ:
    - `identity.sub`
    - `identity.fun_id`
    - `identity.user?.id`
  - `username/display_name/avatar` cũng lấy theo thứ tự fallback tương tự.

2) Dùng dữ liệu đã normalize cho toàn bộ flow
- Tìm/tạo user bằng `normalized.email`
- Upsert `fun_id_links` bằng `normalized.funUserId`
- Upsert `profiles` bằng `normalized.displayName/avatarUrl`
- Tạo session như hiện tại (không đổi kiến trúc đăng nhập).

3) Bổ sung logging chẩn đoán an toàn
- Log các key/cấu trúc nhận được từ `sso-verify` (không log token, không log dữ liệu nhạy cảm đầy đủ).
- Khi thiếu email, trả lỗi rõ hơn:
  - ví dụ: `Missing email in FUN identity payload`
  - kèm danh sách key hiện có để debug nhanh giữa 2 bên.

4) Giữ nguyên phần client
- Không cần đổi `Auth.tsx` và `AuthCallback.tsx` ở vòng này.
- Tập trung fix tương thích payload tại backend bridge để giảm rủi ro.

## Chi tiết kỹ thuật (ngắn gọn)

- File chính cần sửa: `supabase/functions/bridge-login/index.ts`
- Không cần migration DB, không đổi RLS.
- Không đụng các file auto-generated.
- Mục tiêu: tương thích cả format cũ (top-level email) và format mới (email nested trong `user`).

## Kịch bản xác thực sau khi sửa

1) Mở Incognito → vào `angel.fun.rich/auth`
2) Click “Đăng nhập bằng FUN Profile”
3) Đăng nhập FUN Profile
4) Kỳ vọng:
- quay về `/auth/callback`
- không còn báo `No email in FUN Profile identity`
- tự vào trang chủ với session hợp lệ

Nếu vẫn lỗi, log mới trong `bridge-login` sẽ cho biết chính xác payload shape để chốt fix với FUN Profile rất nhanh.
