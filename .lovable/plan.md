

## Báo cáo kiểm tra tài khoản Tú Nguyễn

### Tình trạng hiện tại
- **Whitelist**: Đã có trong `fraud_whitelist` ✅
- **Tín hiệu gian lận chưa xử lý**: **8 tín hiệu** (severity 3, tất cả do trùng device fingerprint) ❌
- **Hệ quả**: Hàm `checkAntiSybil` đếm 8 >= 3 → **đóng băng phần thưởng** (reward_multiplier = 0)

### Nguyên nhân gốc
Hàm `checkAntiSybil` trong `supabase/functions/_shared/anti-sybil.ts` **KHÔNG kiểm tra bảng `fraud_whitelist`** trước khi đếm fraud signals. Vì vậy dù Tú Nguyễn đã được whitelist, phần thưởng vẫn bị đóng băng.

Ngoài ra, hàm `registerDeviceAndIp` cũng **không kiểm tra whitelist** trước khi tạo fraud signal mới → tín hiệu gian lận giả tiếp tục tích lũy.

### Kế hoạch sửa (2 bước)

#### Bước 1: Sửa `anti-sybil.ts` - Thêm kiểm tra whitelist
- Trong `checkAntiSybil`: Sau bước kiểm tra đình chỉ, thêm bước kiểm tra `fraud_whitelist`. Nếu user nằm trong whitelist → bỏ qua hoàn toàn việc đếm fraud signals, trả về `risk_level: 'clear'`
- Trong `registerDeviceAndIp`: Trước khi tạo fraud signal mới, kiểm tra whitelist. Nếu user đã whitelist → không tạo signal

#### Bước 2: Giải quyết 8 tín hiệu chưa xử lý
- UPDATE tất cả `pplp_fraud_signals` chưa resolved của Tú Nguyễn thành `is_resolved = true` với ghi chú "Whitelisted user - device fingerprint false positive"

