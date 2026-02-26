

## Plan: Khôi phục tài khoản Tú Nguyễn (tunguyen) — False Positive

### Vấn đề
- 38 fraud signals "Device hash matches" chưa được giải quyết → hệ thống anti-sybil đóng băng thưởng (≥3 signals severity ≥3 → reward_multiplier = 0)
- Tier hiện tại: 0 (sai — tài khoản đã 37 ngày tuổi, đủ điều kiện Tier 2)
- User kia (`97ca62bf-...`) không tồn tại trong profiles → false positive

### Thay đổi

| # | Loại | Mô tả |
|---|------|-------|
| 1 | SQL Migration | Resolve toàn bộ 38 fraud signals (đánh dấu `is_resolved = true`, ghi chú admin xác nhận hợp lệ) |
| 2 | SQL Migration | Nâng tier từ 0 lên 2 (tài khoản 37 ngày, đủ điều kiện tier 2: 30d+) |

### SQL sẽ thực thi

```sql
-- 1. Resolve 38 fraud signals
UPDATE pplp_fraud_signals 
SET is_resolved = true, 
    resolved_by = 'admin_manual',
    resolved_at = now(),
    details = details || '{"resolution": "Admin xác nhận người dùng hợp lệ - false positive do device hash trùng user không tồn tại"}'::jsonb
WHERE actor_id = 'e4af2f75-9f26-4e07-bca5-0197cf815f9d' 
  AND is_resolved = false;

-- 2. Nâng tier lên 2
UPDATE pplp_user_tiers 
SET tier = 2, updated_at = now() 
WHERE user_id = 'e4af2f75-9f26-4e07-bca5-0197cf815f9d';
```

### Kết quả sau khi xử lý
- Anti-sybil `checkAntiSybil()` sẽ trả `risk_level: 'clear'`, `reward_multiplier: 1.0`
- Thưởng đăng bài, nhật ký, chat sẽ hoạt động bình thường trở lại
- Tier 2 → được 100% giới hạn hành động hàng ngày

