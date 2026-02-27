

## Kết quả rà soát Chống Sybil toàn diện

### Phát hiện 3 nguồn dấu hiệu bất thường

**1. Cụm dấu vân tay thiết bị (Device Fingerprint Clusters)**

| Cluster | Số user | Fingerprint |
|---------|---------|-------------|
| #1 | **36 tài khoản** | `700ee64c...` |
| #2 | **22 tài khoản** | `0272a01a...` |
| #3 | 3 tài khoản | `2d28ba21...` |

Đây là dấu hiệu nghiêm trọng nhất — 36 tài khoản dùng chung 1 thiết bị là mô hình Sybil farming rõ ràng.

**2. Nội dung trùng lặp (Content Similarity)**
- 5 bài viết giống hệt nhau được đăng bởi 3+ tài khoản khác nhau
- Users: Angel Kim Ngân, Angle ThanhThuy, ANGEL GIÀU, LƯU THỊ LIÊN, Angel Nguyễn Hoa

**3. Hoạt động phối hợp thời gian (Coordinated Timing)**
- **ĐINH THỊ CHUNG**: xuất hiện trong **27/20 khung giờ** phối hợp — dấu hiệu điều phối nhóm
- 15+ user khác xuất hiện 3-9 lần trong các khung giờ phối hợp lặp lại 8+ ngày

### Tổng hợp user cần đưa vào Blacklist

Sau khi loại trừ user đã WL và đã bị đình chỉ, còn **~55 user** cần tạo fraud signal mới. Trong đó ~23 user đã có signal chưa xử lý (đã nằm trong BL), còn **~32 user mới** chưa có signal nào.

### Kế hoạch thực hiện

**1. Tạo migration SQL** — INSERT fraud signals loại `CROSS_ACCOUNT_SCAN` severity 4 cho tất cả ~32 user mới phát hiện, ghi rõ lý do:
- Cluster #1: "Cùng dấu vân tay thiết bị với 35 tài khoản khác"
- Cluster #2: "Cùng dấu vân tay thiết bị với 21 tài khoản khác"
- Cluster #3: "Cùng dấu vân tay thiết bị với 2 tài khoản khác"
- Content similarity: "Nội dung bài viết trùng lặp với nhiều tài khoản khác"
- Coordinated timing: "Hoạt động phối hợp thời gian bất thường (N lần)"

**2. Tự động loại trừ** — Query sẽ bỏ qua user đã có trong `fraud_whitelist` và user đã bị `user_suspensions` (lifted_at IS NULL).

Sau khi chạy migration, tất cả user này sẽ tự động hiển thị trong tab **Blacklist** của trang Quản lý Tin cậy để Admin duyệt và xử lý.

