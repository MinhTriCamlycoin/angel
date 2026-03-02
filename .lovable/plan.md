

## Cập nhật attesterThreshold on-chain lên 3

### Vấn đề
Contract hiện tại có `attesterThreshold = 1`, nghĩa là chỉ cần 1 chữ ký attester là đủ để mint on-chain. Cần nâng lên 3 để enforce multisig 3-of-3 thực sự.

### Cách thực hiện

**Tạo Edge Function `gov-set-threshold`** — Gọi `govSetAttesterThreshold(3)` trên smart contract:

1. Đọc `guardianGov()` từ contract để xác định ví nào có quyền governance
2. Thử ký bằng `ATTESTER_PRIVATE_KEY` trước, nếu không khớp guardianGov thì thử `TREASURY_PRIVATE_KEY`  
3. Gọi `govSetAttesterThreshold(3)` và trả về tx hash

### Rủi ro cần lưu ý
- Nếu cả `ATTESTER_PRIVATE_KEY` lẫn `TREASURY_PRIVATE_KEY` đều không phải là `guardianGov` (deployer wallet), giao dịch sẽ bị revert với lỗi `NOT_GOV`. Trong trường hợp đó, cần thêm deployer private key vào secrets.
- Sau khi threshold = 3, mỗi lần mint on-chain cần đủ 3 chữ ký hợp lệ từ 3 nhóm khác nhau. Edge function `pplp-authorize-mint` (hiện dùng 1 key) sẽ không thể tự mint nữa — phải dùng flow multisig qua Attester Panel.

### Chi tiết kỹ thuật

```
Edge Function: supabase/functions/gov-set-threshold/index.ts
- POST { threshold: 3 }
- Contract: 0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6
- ABI: govSetAttesterThreshold(uint256)
- Requires: guardianGov wallet private key
- BSC Testnet RPCs with failover
```

