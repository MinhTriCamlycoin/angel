

# Mô phỏng tấn công hacker toàn diện: 4 vector cùng lúc

## Kịch bản

Tạo một test file mới `supabase/functions/pplp-detect-fraud/attack-simulation.test.ts` mô phỏng **1 hacker điều khiển nhiều tài khoản giả** tấn công đồng thời 4 vector:

### Phase 1: Tạo đội quân Sybil (5 fake accounts cùng device_hash + IP)
- Gọi `pplp-detect-fraud` cho 5 actor_id khác nhau nhưng cùng `device_hash` và `ip_hash`
- Verify: Hệ thống phát hiện SYBIL signal cho các account trùng fingerprint

### Phase 2: Bot Spam từ 1 account (content_length < 10, lặp lại)
- Gửi liên tục 3 request với `content_length: 2` từ cùng 1 actor
- Verify: SPAM signal triggered mỗi lần, risk_score tích lũy qua `historical_unresolved_signals`

### Phase 3: Content Farming (duplicate content_hash)
- Gửi cùng `content_hash` từ 2 account khác nhau trong đội quân Sybil
- Verify: SPAM signal cho duplicate content

### Phase 4: Combined Attack — tất cả vector cùng lúc
- 1 request chứa **cả 4 tín hiệu**: `device_hash` trùng + `ip_hash` trùng + `content_length: 3` + `content_hash` trùng + `action_id` (cho collusion check)
- Verify: Nhiều signals cùng lúc → `risk_score` cao → `recommendation` = MONITOR/REWARDS_FROZEN/AUTO_SUSPENDED
- Verify: `auto_action` được trigger khi risk > 25

### Phase 5: Whitelist immunity
- Gửi **cùng payload tấn công** cho 1 user whitelisted
- Verify: `risk_score = 0`, `recommendation = WHITELISTED` — hệ thống miễn nhiễm hoàn toàn

### Phase 6: Báo cáo tổng kết
- In bảng tổng hợp kết quả tất cả phases
- So sánh risk_score giữa attacker vs whitelisted user

## Chi tiết kỹ thuật

- File mới: `supabase/functions/pplp-detect-fraud/attack-simulation.test.ts`
- Dùng Deno test runner, gọi edge function thật (deployed)
- ~8 test cases, chạy tuần tự (Phase 1→6) để mô phỏng timeline tấn công thực tế
- Tất cả dùng fake UUID để không ảnh hưởng user thật
- Response body luôn consume (`await res.text()`)

