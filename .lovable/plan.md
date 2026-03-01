

## Cấu hình Mint Pool & Kiểm tra PPLP Acceptance

### Hiện trạng

| Chỉ số | Giá trị |
|---|---|
| Epoch #1 (Tháng 3/2026) | `open`, ID: `5e5e1d11-...` |
| Mint Pool hiện tại | **0 FUN** (chưa cấu hình) |
| Users hoạt động tháng 3 | 42 |
| Tổng Light Score tháng 3 | 13,477.53 |
| PPLP Accepted | **0 / 376 users** ← vấn đề chính |

### Vấn đề phát hiện

1. **Mint Pool = 0**: Cần update lên 5,000,000 FUN
2. **0 users có pplp_accepted_at**: Theo §13 Eligibility, user phải accept PPLP mới đủ điều kiện mint. Hiện **không ai** sẽ đủ điều kiện nếu không xử lý.

### Kế hoạch triển khai

#### 1. Update Mint Pool cho Epoch #1
- UPDATE `pplp_mint_cycles` SET `total_mint_pool = 5000000` WHERE id = cycle hiện tại

#### 2. Xử lý PPLP Acceptance
Hai lựa chọn:
- **Option A (Khuyến nghị)**: Auto-accept cho 42 users đã hoạt động trong tháng 3 — vì đây là giai đoạn khởi động, users đã tham gia hệ thống tức là đã đồng ý ngầm
- **Option B**: Giữ nguyên, yêu cầu users accept thủ công qua UI (có thể dẫn đến 0 người đủ điều kiện mint tháng này)

#### 3. Cập nhật `max_share_per_user`
Hiện tại giá trị là `10000` (bất thường). Cần sửa về `0.03` (3%) theo spec LS-Math v1.0.

### Chi tiết kỹ thuật
- Update dữ liệu qua SQL insert tool (không phải migration vì chỉ thay đổi data)
- Nếu chọn Option A: UPDATE `profiles` SET `pplp_accepted_at = NOW()` cho users có hoạt động trong `features_user_day` tháng 3

