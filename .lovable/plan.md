
Mình đã xác định được nguyên nhân chính từ log runtime:

- Lỗi hiện tại không còn là “Missing email”.
- Lỗi mới là: `Failed to create user account` với mã `email_exists`.
- Log backend xác nhận:
  - `Email recovered from hint_email` (email đã có)
  - Sau đó `createUser` fail vì email đã tồn tại.

Nguyên nhân gốc:
- `bridge-login` đang tìm user bằng `auth.admin.listUsers()` 1 lần rồi `.find(...)`.
- Hệ thống hiện có 415 users, nên 1 lần gọi list không đảm bảo chứa user cần tìm.
- Khi không thấy user do giới hạn phân trang, code đi tạo mới -> đụng unique email -> `email_exists`.

Kế hoạch sửa (không đổi DB/RLS):

1) Sửa logic tìm user theo email trong `supabase/functions/bridge-login/index.ts`
- Tạo helper `findUserByEmail(email)` có phân trang:
  - gọi `listUsers({ page, perPage })` theo vòng lặp
  - so khớp email lowercase
  - dừng khi hết dữ liệu hoặc đã tìm thấy.

2) Đổi flow “find or create” thành “find (paginated) -> create -> recover on conflict”
- Bước A: tìm user bằng helper phân trang.
- Bước B: nếu chưa có thì `createUser`.
- Bước C: nếu `createUser` trả `email_exists`, gọi lại helper phân trang để lấy đúng user id thay vì fail 500.
- Chỉ trả lỗi nếu thật sự không resolve được user sau conflict.

3) Giữ nguyên phần normalize email đã làm
- Vẫn giữ fallback `token_info`, JWT decode, `hint_email`.
- Không thay đổi client callback ở vòng này.

4) Nâng chất lượng log/chẩn đoán
- Log rõ nhánh xử lý:
  - found existing (paginated)
  - created new
  - recovered after email_exists
- Không log token/email thô (chỉ masked/boolean).

5) Kiểm thử sau khi sửa
- Case 1: user đã tồn tại email trước đó -> đăng nhập FUN phải thành công, không còn “Failed to create user account”.
- Case 2: user mới hoàn toàn -> tạo account + login thành công.
- Case 3: đăng nhập lặp lại nhiều lần -> luôn map đúng cùng một user_id.
- Xác nhận trên flow thực tế `/auth -> FUN Profile -> /auth/callback`.

Ghi chú kỹ thuật quan trọng:
- Đây là bug xử lý phân trang + race-safe provisioning, không phải lỗi từ FUN payload ở thời điểm hiện tại.
- Không cần migration database.
