

## Vấn đề
Tài khoản Tú Nguyễn có 12+ tín hiệu SYBIL (severity 3, device fingerprint match) chưa được giải quyết. Hệ thống anti-sybil đóng băng phần thưởng khi >= 3 signals chưa resolve.

## Giải pháp

### Bước 1: Resolve tất cả fraud signals của Tú Nguyễn
- UPDATE `pplp_fraud_signals` SET `is_resolved = true`, `resolution_notes = 'Device fingerprint false positive - verified real user'` cho tất cả signals chưa resolve của user này.

### Bước 2: Thêm vào fraud_whitelist
- INSERT vào `fraud_whitelist` để tài khoản này bypass các kiểm tra gian lận trong tương lai, tương tự như đã làm với các tài khoản tin cậy khác (ANGEL ÁNH NGUYỆT, Hoàng Tỷ Đô).

### Kết quả
- Sau khi resolve signals, `checkAntiSybil()` sẽ trả `risk_level = 'clear'` và `reward_multiplier` bình thường theo account age gate.
- User sẽ nhận thưởng câu hỏi, đăng bài, nhật ký như bình thường.

