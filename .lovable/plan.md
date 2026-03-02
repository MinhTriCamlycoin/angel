

## Thiết kế lại Attester Panel: Giữ thông tin sau khi ký

### Vấn đề hiện tại
1. **Hook `useAttesterSigning`** chỉ query status `pending_sig` và `signing`, bỏ qua `signed` — nên request đã ký đủ 3/3 biến mất hoàn toàn
2. **Filter client-side** loại bỏ request mà nhóm đã ký — nên sau khi ký xong, request biến mất khỏi danh sách của attester đó

### Thay đổi

**1. Hook `useAttesterSigning.ts`**
- Mở rộng query để include cả status `signed` (đã ký đủ 3/3)
- Bỏ filter loại bỏ request đã ký — trả về tất cả requests
- Tách thành 2 danh sách: `pendingRequests` (cần ký) và `allRequests` (tất cả, bao gồm đã ký)

**2. Page `AttesterPanel.tsx`**
- Chia giao diện thành 2 section:
  - **"Cần ký"**: Các request nhóm chưa ký → hiện nút "Ký xác nhận"
  - **"Đã ký"**: Các request nhóm đã ký hoặc đã hoàn tất 3/3 → hiện thông tin chi tiết ai đã ký, thời gian ký, trạng thái
- Mỗi request card hiển thị đầy đủ:
  - Danh sách 3 nhóm với tên người ký và thời gian ký
  - Badge trạng thái: Chờ ký / Đang ký / Đã ký đủ
  - Nếu đã ký đủ 3/3 → hiện badge "Sẵn sàng mint"

### Chi tiết kỹ thuật

- Query: `.in("status", ["pending_sig", "signing", "signed"])` — thêm `signed`
- Không filter theo group nữa — tất cả attester đều thấy tất cả requests
- Phân loại client-side thành 2 nhóm để render UI phù hợp
- SignatureStatus component giữ nguyên, đã hiển thị đúng thông tin chữ ký

