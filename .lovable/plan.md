

## Phân tích: Lỗ hổng Whitelist trong hệ thống rà soát tự động

Hiện tại, hầu hết các điểm rà soát đã kiểm tra `fraud_whitelist` trước khi tạo fraud signal:
- `run_cross_account_scan()` — **đã có** whitelist check
- `pplp-detect-fraud` edge function — **đã có** whitelist check  
- `anti-sybil.ts` (`registerDeviceAndIp`) — **đã có** whitelist check
- `auto_fraud_check()` trigger — **đã có** whitelist check

Tuy nhiên có **1 lỗ hổng quan trọng**:

### `register_device_fingerprint()` — CHƯA có whitelist check

Hàm database này tạo fraud signal SYBIL khi phát hiện device hash trùng, nhưng **không kiểm tra** user có trong `fraud_whitelist` hay không. Khi user WL dùng chung thiết bị hoặc trùng fingerprint, họ vẫn bị tạo tín hiệu gian lận → xuất hiện trong BL.

### Kế hoạch sửa

**1. Migration: Cập nhật `register_device_fingerprint()`**

Thêm kiểm tra `fraud_whitelist` trước khi tạo fraud signal:

```sql
CREATE OR REPLACE FUNCTION public.register_device_fingerprint(_user_id UUID, _device_hash TEXT)
RETURNS JSONB ...
AS $$
DECLARE
  ...
  v_is_whitelisted BOOLEAN := false;
BEGIN
  -- Check whitelist first
  SELECT EXISTS (
    SELECT 1 FROM fraud_whitelist WHERE user_id = _user_id
  ) INTO v_is_whitelisted;

  -- Check device hash collision
  SELECT COUNT(DISTINCT user_id) INTO v_other_users ...

  IF v_other_users > 0 AND NOT v_is_whitelisted THEN
    -- Only create fraud signal if NOT whitelisted
    INSERT INTO pplp_fraud_signals ...
  END IF;

  -- Upsert device registry (vẫn giữ, chỉ bỏ flag nếu whitelist)
  ...
END;
$$;
```

Chỉ cần 1 migration duy nhất. Không cần sửa code frontend hay edge function nào khác.

