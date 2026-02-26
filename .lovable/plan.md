

## Plan: Gom yêu cầu mint theo user — 1 lệnh ký duy nhất

### Bối cảnh
Hiện tại mỗi action = 1 lệnh `lockWithPPLP` on-chain riêng biệt (1 EIP-712 signature + 1 transaction). Vì tất cả action đều dùng unified `FUN_REWARD` on-chain, có thể gom nhiều action cùng 1 user thành **1 lệnh ký + 1 giao dịch on-chain duy nhất** với tổng amount cộng dồn.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `supabase/functions/pplp-batch-lock/index.ts` | **Edge function MỚI**: nhận `actor_id` + `wallet_address`, gom tất cả pending mint requests của user đó, tính tổng amount, ký 1 EIP-712 signature, gọi 1 lệnh `lockWithPPLP` on-chain, rồi cập nhật tất cả mint requests cùng tx_hash |
| 2 | `src/pages/AdminMintApproval.tsx` | Thêm nút **"⚡ Gom & Ký theo User"** — nhóm pending requests theo `actor_id + wallet_address`, hiển thị bảng tóm tắt (user, số actions, tổng FUN), gọi batch-lock cho từng user |

### Chi tiết kỹ thuật

**Edge Function `pplp-batch-lock`:**

```text
Input: { actor_id, wallet_address }

1. Fetch ALL pending mint requests WHERE actor_id = X AND recipient_address = Y
2. Validate: user not banned, no fraud signals severity >= 4
3. Sum total amount (user portion after cascade)
4. Get on-chain nonce for wallet_address
5. Compute unified actionHash = keccak256("FUN_REWARD")
6. Compute aggregated evidenceHash = keccak256(sorted evidence hashes)
7. Sign 1 EIP-712 PureLoveProof with total amount
8. Call lockWithPPLP(wallet, "FUN_REWARD", totalAmountWei, aggEvidenceHash, [sig])
9. On success: Update ALL mint requests → status="minted", same tx_hash
10. Update ALL pplp_actions → status="minted"
11. Log cascading distribution for each action
12. Send 1 notification to user with total amount
```

**Frontend flow:**

```text
Admin nhấn "⚡ Gom & Ký theo User"
  │
  ├── Group pending requests by (actor_id + wallet_address)
  │
  ├── Hiển thị confirm dialog:
  │   "Gom 15 users, tổng 42 actions, 1,234,567 FUN"
  │
  └── Gọi pplp-batch-lock lần lượt cho từng user group
      └── Progress bar: 3/15 users đã xử lý
```

### Lưu ý quan trọng
- Mỗi user chỉ cần 1 nonce → 1 giao dịch on-chain, tiết kiệm gas đáng kể
- Phân biệt action_type vẫn giữ ở DB (mỗi mint request giữ nguyên action_id riêng)
- Cascade distribution tính riêng cho từng action, log riêng
- Nếu 1 user có requests đến nhiều wallet khác nhau → tách thành nhiều nhóm

