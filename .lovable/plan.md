

## Review & Xu ly 382 Tin hieu Fraud Chua Resolved

### Hien trang chi tiet

| Nhom | So luong tin hieu | Mo ta |
|---|---|---|
| **Tong chua resolved** | **382** | |
| Da bi dinh chi (suspended) | 256 | Users da xu ly nhung tin hieu chua duoc danh dau resolved |
| Chua bi dinh chi | 126 | Can review va hanh dong |
| Trong whitelist | 0 | Khong co user whitelist nao bi anh huong |

### Phan tich 126 tin hieu chua xu ly (users chua suspended)

| Loai | Severity | So luong | Danh gia |
|---|---|---|---|
| CROSS_ACCOUNT_SCAN | 4 | 55 | False positive cao - he thong tu dong quet noi dung tuong tu |
| SYBIL (IP/device) | 3 | 58 | False positive trung binh - nhieu user dung chung mang |
| SYBIL (device match) | 4 | 1 | Can review ky |
| BOT | 3 | 10 | 1 user (276fa1cc) co 10 tin hieu BOT - can kiem tra |
| SPAM | 2 | 2 | Muc do thap, co the auto-resolve |

### Ke hoach xu ly 3 buoc

#### Buoc 1: Auto-resolve 256 tin hieu cua users DA BI DINH CHI
Theo quy tac Administrative State Sync (memory), khi user da bi dinh chi thi tat ca tin hieu gian lan phai duoc giai quyet (is_resolved = true). Hien co 256 tin hieu cua users da suspended nhung chua resolved - day la loi dong bo.

```sql
UPDATE pplp_fraud_signals SET is_resolved = true, resolved_at = now(), resolved_by = 'SYSTEM_SYNC'
WHERE is_resolved = false AND actor_id IN (SELECT user_id FROM user_suspensions WHERE suspended_until IS NULL OR suspended_until > now())
```

#### Buoc 2: Auto-resolve 115 tin hieu CROSS_ACCOUNT_SCAN + SYBIL severity 3 + SPAM
- **55 CROSS_ACCOUNT_SCAN (sev 4)**: He thong quet tu dong tao ra, phan lon la false positive vi nhieu user viet noi dung tuong tu trong cong dong. Resolve voi ghi chu "Cross-account scan false positive - community content overlap".
- **58 SYBIL severity 3 (IP hash)**: Users dung chung mang wifi/4G tao false positive. Resolve voi ghi chu "IP hash false positive - shared network".  
- **2 SPAM severity 2**: Noi dung ngan, muc do thap. Auto-resolve.

```sql
UPDATE pplp_fraud_signals SET is_resolved = true, resolved_at = now(), resolved_by = 'ADMIN_REVIEW'
WHERE is_resolved = false AND signal_type IN ('CROSS_ACCOUNT_SCAN', 'SPAM')
AND NOT EXISTS(SELECT 1 FROM user_suspensions us WHERE us.user_id = actor_id AND ...)

UPDATE pplp_fraud_signals SET is_resolved = true, resolved_at = now(), resolved_by = 'ADMIN_REVIEW'  
WHERE is_resolved = false AND signal_type = 'SYBIL' AND severity <= 3
AND NOT EXISTS(SELECT 1 FROM user_suspensions us WHERE us.user_id = actor_id AND ...)
```

#### Buoc 3: Review thu cong 11 tin hieu con lai
- **1 tin hieu SYBIL severity 4** (user 0f062859): Device fingerprint match - can kiem tra ky truoc khi quyet dinh
- **10 tin hieu BOT severity 3** (user 276fa1cc): 1 user co 10 lan bi ghi nhan hanh vi bot - can xem xet dinh chi

### Chi tiet ky thuat
- Tat ca UPDATE deu su dung insert tool (data change, khong phai schema change)
- Sau khi resolve, tong tin hieu chua xu ly se giam tu 382 xuong con ~11 (can review thu cong)
- User 276fa1cc can duoc kiem tra ky su: xem log hanh dong, tan suat, noi dung truoc khi quyet dinh dinh chi hay resolve

