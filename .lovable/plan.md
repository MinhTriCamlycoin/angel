

## Plan: Cập nhật tài liệu attester wallet & cấu hình 1-sig

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `supabase/functions/pplp-authorize-mint/index.ts` | Thêm comment ghi rõ attester wallet address và ghi chú 1-sig hiện tại, 3-sig sẽ áp dụng sau |
| 2 | `docs/FUN_MONEY_MINTING_SYSTEM.md` | Cập nhật tài liệu: ghi rõ attester wallet, giải thích cơ chế 1-sig → 3-sig trong tương lai |
| 3 | `src/lib/funMoneyABI.ts` | Thêm constant `ATTESTER_ADDRESSES` chứa danh sách attester đã đăng ký |
| 4 | `contracts/README.md` | Cập nhật thông tin attester và governance setup |

### Chi tiết kỹ thuật

**`pplp-authorize-mint/index.ts`** — thêm block comment sau `CONTRACT_ADDRESS`:
```typescript
// Registered Attester (via govSetAttester on contract)
// Wallet: 0x02D5578173bd0DB25462BB32A254Cd4b2E6D9a0D
// Derived from TREASURY_PRIVATE_KEY secret
// Current: 1-sig (attesterThreshold = 1)
// Future: 3-sig when additional attester keys are added
```

**`src/lib/funMoneyABI.ts`** — thêm constant:
```typescript
export const REGISTERED_ATTESTERS = [
  "0x02D5578173bd0DB25462BB32A254Cd4b2E6D9a0D", // Attester #1 (Treasury signer)
] as const;
```

Không thay đổi logic code — chỉ cập nhật documentation và constants để tracking.

