

## Plan: Fix Attester Key và Reset 918 Yêu Cầu Lỗi

### Vấn đề
- 918 mint requests đang bị kẹt ở status `signed` với lỗi `ATTESTER_NOT_REGISTERED` vì đã ký bằng ví Treasury thay vì ví Attester
- `pplp-authorize-mint` vẫn đang dùng `TREASURY_PRIVATE_KEY` — chưa được cập nhật

### Thay đổi

| # | Thay đổi | Mô tả |
|---|----------|-------|
| 1 | **Database migration** | Reset 918 requests từ `signed` → `pending`, xóa `on_chain_error`, `signature`, `signer_address` để có thể gom & ký lại |
| 2 | **`pplp-authorize-mint/index.ts`** | Đổi `TREASURY_PRIVATE_KEY` → `ATTESTER_PRIVATE_KEY` (fallback Treasury) — giống batch-lock |
| 3 | **`pplp-batch-lock/index.ts`** | Sửa error message từ "TREASURY_PRIVATE_KEY not configured" → "ATTESTER_PRIVATE_KEY not configured" |

### SQL Migration
```sql
UPDATE pplp_mint_requests
SET status = 'pending',
    signature = NULL,
    signer_address = NULL,
    nonce = NULL,
    on_chain_error = NULL
WHERE status = 'signed'
  AND on_chain_error = 'ATTESTER_NOT_REGISTERED';
```

### Edge Function Changes

**`pplp-authorize-mint`** line 164:
```typescript
// Before
const signerPrivateKey = Deno.env.get("TREASURY_PRIVATE_KEY");
// After
const signerPrivateKey = Deno.env.get("ATTESTER_PRIVATE_KEY") || Deno.env.get("TREASURY_PRIVATE_KEY");
```

**`pplp-batch-lock`** line 92:
```typescript
// Before
JSON.stringify({ error: "TREASURY_PRIVATE_KEY not configured" })
// After
JSON.stringify({ error: "ATTESTER_PRIVATE_KEY not configured" })
```

Sau khi deploy, admin chỉ cần nhấn lại **"⚡ Gom & Ký theo User"** để xử lý 918 yêu cầu với đúng ví Attester.

