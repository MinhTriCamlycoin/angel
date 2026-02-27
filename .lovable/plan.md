

## Kế hoạch: Thêm nút Đình chỉ & Cấm vĩnh viễn vào tab Blacklist

### Sửa `src/pages/AdminTrustList.tsx`

**1. Thêm state cho dialog đình chỉ/cấm**
- `suspendDialogOpen`, `suspendType` (`temporary` | `permanent`), `suspendTarget` (user info), `suspendReason`, `suspendDuration` (cho temporary — số ngày)

**2. Thêm 2 nút mới trong mỗi row Blacklist**
- Nút **"Đình chỉ"** (variant outline, icon `Clock`) → mở dialog với `suspension_type = 'temporary'`, cho nhập số ngày + lý do
- Nút **"Cấm vĩnh viễn"** (variant destructive, icon `Ban`) → mở dialog với `suspension_type = 'permanent'`, chỉ cần lý do

**3. Dialog xử lý đình chỉ/cấm**
- Nhập lý do (bắt buộc)
- Nếu đình chỉ tạm: thêm input số ngày (mặc định 7)
- Xác nhận → INSERT vào `user_suspensions` với:
  - `user_id`, `suspension_type`, `reason`, `created_by` (admin)
  - `suspended_until` = now + N ngày (nếu temporary), NULL (nếu permanent)
- Đồng thời resolve tất cả fraud signals (`is_resolved = true`)
- Sau khi xong → refresh data (user sẽ tự động biến mất khỏi BL vì đã bị filter)

**4. Hỗ trợ batch** — thêm nút batch "Đình chỉ tất cả" và "Cấm vĩnh viễn tất cả" trong thanh batch actions khi chọn nhiều user BL

Chỉ sửa 1 file: `src/pages/AdminTrustList.tsx`. Không cần migration vì bảng `user_suspensions` đã có đủ cấu trúc.

