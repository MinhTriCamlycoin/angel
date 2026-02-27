

## Kết quả đình chỉ Cluster #1 & #2

### Đã hoàn thành: Đình chỉ vĩnh viễn 23/23 tài khoản

| Cluster | Tên | User ID |
|---------|-----|---------|
| #1 | Bích Hà | ea112b2a |
| #1 | Kim trợ | 0152f5bf |
| #1 | Mỹ Nguyễn | d8721926 |
| #1 | Ngô Thanh | 9726ccf7 |
| #1 | Ngoc Vân | b06a0106 |
| #1 | Nguyễn Lê Hồng Thắm | 0619c77a |
| #1 | Nguyễn Thu Huyền | f2220c18 |
| #1 | Thanh Tâm Lê | 88760963 |
| #1 | Trần Hà | dcd2b704 |
| #1 | Trần Nhã Vy | 66ed0c30 |
| #1 | Trần Thu Hà | ce537520 |
| #2 | binh tran | 6a866438 |
| #2 | hgroup | 253dda36 |
| #2 | huong ho | 9c71b38d |
| #2 | lý sữu | 54029c78 |
| #2 | ngân nhung | 4e0f4e17 |
| #2 | nguyen nhung | 4f353c78 |
| #2 | tran bon | bbf90e9f |
| #2 | trịnh khả duy | 384cea9e |
| #2 | tuấn anh | 6f54b159 |
| #2 | xuân vinh | ab4af8e4 |
| #2 | (ẩn danh) | a3d4ec64 |
| #2 | (ẩn danh) | 8e7ff7cf |

### Kết quả chi tiết
- **23 tài khoản** đã bị cấm vĩnh viễn (permanent ban)
- **4 yêu cầu rút tiền** đang chờ đã bị từ chối tự động
- **0 lỗi** trong quá trình xử lý
- Tin nhắn chữa lành đã được gửi cho tất cả

### Cần bổ sung: Resolve fraud signals

Fraud signals của 23 user này vẫn chưa được đánh dấu `is_resolved = true` trong bảng `pplp_fraud_signals`, vì edge function `bulk-suspend-users` hiện chưa có logic này. Cần:

1. **Sửa `supabase/functions/bulk-suspend-users/index.ts`** — thêm dòng resolve fraud signals sau khi suspend thành công (giống logic trong AdminTrustList.tsx)
2. **Deploy lại** và gọi edge function một lần nữa (sẽ skip suspend vì duplicate, nhưng resolve signals)

Hoặc đơn giản hơn: vào trang `/admin/trust-list`, các user này đã biến mất khỏi BL vì đã có suspension record. Fraud signals sẽ không ảnh hưởng gì thêm vì tài khoản đã bị cấm.

