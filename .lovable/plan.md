

## Plan: Lọc & từ chối yêu cầu mint từ tài khoản bị ban/nghi gian lận

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/pages/AdminMintApproval.tsx` | Thêm logic auto-detect banned/suspicious users khi fetch data, hiện badge cảnh báo, thêm nút "Lọc tài khoản vi phạm" |
| 2 | `supabase/functions/cleanup-banned-mint-requests/index.ts` | Edge function mới: batch reject pending requests từ banned users, batch pause requests từ users có fraud signals |

### Chi tiết

**Edge Function `cleanup-banned-mint-requests`:**
- Query tất cả `pplp_mint_requests` status = `pending`
- Join `user_suspensions` (where `lifted_at IS NULL`) → reject với lý do "Vi phạm hệ thống Angel AI về tính minh bạch trong hoạt động ánh sáng"
- Join `pplp_fraud_signals` (unresolved, severity >= 3) → đánh dấu status mới hoặc giữ pending nhưng gắn cờ cho admin duyệt thủ công
- Trả về summary: `{ rejected_count, flagged_count, rejected_users, flagged_users }`
- Chỉ admin mới gọi được (verify JWT + check user_roles)

**Frontend `AdminMintApproval.tsx`:**
- Khi fetch requests, cross-check `user_suspensions` để đánh dấu banned users
- Hiển thị badge đỏ 🚫 "Tài khoản bị ban" hoặc badge cam ⚠️ "Nghi gian lận" trên mỗi MintRequestCard
- Thêm nút **"🛡️ Lọc tài khoản vi phạm"** ở header, gọi edge function cleanup
- Sau khi cleanup, auto-refresh danh sách
- Banned requests chuyển sang tab "Từ chối" với lý do rõ ràng
- Suspicious requests giữ ở tab "Chờ duyệt" nhưng highlight cam để admin duyệt thủ công

### Flow

```text
Admin nhấn "Lọc tài khoản vi phạm"
  │
  ├── Banned users (user_suspensions active)
  │   └── Reject all pending mint requests
  │       └── Lý do: "Vi phạm hệ thống Angel AI về tính minh bạch"
  │
  └── Suspicious users (fraud_signals severity >= 3, unresolved)
      └── Giữ pending, gắn cờ "nghi gian lận"
      └── Admin duyệt thủ công từng yêu cầu
```

