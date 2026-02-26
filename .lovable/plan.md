

## Plan: Thống nhất action on-chain thành FUN_REWARD duy nhất

### Vấn đề hiện tại
- Mỗi loại hành động (QUESTION_ASK, CONTENT_CREATE, JOURNAL_WRITE...) đều gọi `lockWithPPLP()` với action name riêng
- Contract yêu cầu mỗi action phải được `govRegisterAction()` trước → phải đăng ký 12+ actions
- Nếu thiếu 1 action → lỗi `ACTION_NOT_REGISTERED` on-chain

### Giải pháp
Tất cả gọi on-chain đều dùng **1 action duy nhất: `"FUN_REWARD"`**. Phân biệt loại hành động chỉ ở database (`pplp_actions.action_type`).

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `supabase/functions/pplp-authorize-mint/index.ts` | Thay `actionName = action.action_type` → `actionName = "FUN_REWARD"` (hardcode). Giữ `action.action_type` trong log/DB để audit |
| 2 | `contracts/scripts/deploy.js` | Đổi danh sách `initialActions` thành chỉ `["FUN_REWARD"]` |
| 3 | `docs/FUN_MONEY_MINTING_SYSTEM.md` | Cập nhật tài liệu mô tả kiến trúc unified action |

### Chi tiết kỹ thuật

Thay đổi cốt lõi trong `pplp-authorize-mint/index.ts` (line 379-381):

```text
TRƯỚC:
  const actionName = action.action_type;        // "QUESTION_ASK", "CONTENT_CREATE"...
  const actionHash = hashActionName(actionName);

SAU:
  const UNIFIED_ACTION = "FUN_REWARD";
  const actionName = UNIFIED_ACTION;             // Always "FUN_REWARD" on-chain
  const actionHash = hashActionName(actionName);
  // action.action_type vẫn được lưu trong DB để phân biệt
```

- `action_hash` trong `pplp_mint_requests` sẽ luôn là `keccak256("FUN_REWARD")`
- Database columns `action_type`, `metadata` vẫn giữ nguyên để audit/reporting
- Chỉ cần đăng ký **1 lần** `govRegisterAction("FUN_REWARD", 1)` trên contract mới

### Yêu cầu tiên quyết
- Guardian wallet phải gọi `govRegisterAction("FUN_REWARD", 1)` trên contract `0x39A1...0CD6` trước khi mint

