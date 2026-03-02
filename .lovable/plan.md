

## Tích hợp Multisig 3-of-3 (WILL + WISDOM + LOVE) cho PPLP

### Phân tích hiện trạng
Hệ thống hiện tại sử dụng **1-of-1 attester** (backend tự ký bằng `ATTESTER_PRIVATE_KEY`). Tài liệu yêu cầu nâng cấp lên **3-of-3 multisig** với 11 thành viên GOV ký qua MetaMask trên trình duyệt.

### Phạm vi thay đổi

#### 1. Database Migration
- Thêm cột vào `pplp_mint_requests`:
  - `multisig_signatures` (JSONB) — lưu chữ ký `{ will: {...}, wisdom: {...}, love: {...} }`
  - `multisig_completed_groups` (TEXT[]) — nhóm đã ký xong
  - `multisig_required_groups` (TEXT[] DEFAULT `{'will','wisdom','love'}`)
  - `amount_wei` (TEXT) — số FUN dạng Wei
  - `platform_id` (TEXT DEFAULT `'angel_ai'`)
- Cập nhật các giá trị `status` hỗ trợ: `pending_sig` → `signing` → `signed` → `submitted` → `confirmed` / `failed`
- Thêm RLS policies cho Attester (SELECT/UPDATE trên request đang signing)
- Bật Realtime cho bảng `pplp_mint_requests`

#### 2. GOV Groups Config (`src/lib/govGroups.ts`)
- Định nghĩa 11 địa chỉ ví thuộc 3 nhóm WILL (3), WISDOM (3), LOVE (3)
- Helper: `getAttesterGroup(address)`, `getAttesterName(address)`, `isGovAttester(address)`
- Export danh sách cho frontend hooks sử dụng

#### 3. Frontend Hook: `useAttesterSigning` (`src/hooks/useAttesterSigning.ts`)
- Kết nối ví MetaMask của GOV member
- Xác định nhóm (WILL/WISDOM/LOVE) từ địa chỉ ví
- Lấy danh sách request đang `pending_sig` hoặc `signing` mà nhóm mình chưa ký
- Ký EIP-712 PureLoveProof qua `ethers.BrowserProvider.signTypedData`
- Cập nhật `multisig_signatures[group]` và `multisig_completed_groups` vào DB
- Khi đủ 3/3 → status chuyển thành `signed`

#### 4. Frontend Hook: `useMintSubmit` (`src/hooks/useMintSubmit.ts`)
- Cho Admin verify nonce on-chain trước khi submit
- Gom 3 chữ ký theo thứ tự [WILL, WISDOM, LOVE]
- Gọi `lockWithPPLP(user, action, amount, evidenceHash, [sig1, sig2, sig3])` on-chain
- Cập nhật status `submitted` → `confirmed` / `failed`

#### 5. Edge Function: `pplp-mint-fun` (mới)
- Nhận `action_ids`, `recipient_address` từ frontend
- Validate actions, kiểm tra fraud/suspension
- Tính cascading distribution
- Tạo row `pplp_mint_requests` với status `pending_sig` (KHÔNG tự ký)
- Lưu `amount_wei`, `action_hash`, `evidence_hash`, `nonce` on-chain

#### 6. Attester Panel UI (`src/pages/AttesterPanel.tsx`)
- Trang cho GOV members: hiển thị request cần ký
- Hiện trạng thái ký của từng nhóm (đã ký / chưa ký)
- Nút "Ký" gọi `useAttesterSigning.signRequest()`
- Realtime update khi nhóm khác ký

#### 7. Cập nhật Admin Mint Approval
- Thêm tab/flow cho request `signed` (đủ 3/3): nút "Submit On-chain"
- Hiển thị trạng thái ký multisig (WILL ✓, WISDOM ✓, LOVE ✗)
- Verify nonce trước khi submit
- Cập nhật `handleApprove` để dùng 3 chữ ký thay vì backend auto-sign

#### 8. Cập nhật `funMoneyABI.ts`
- Thêm `GOV_GROUPS` config
- Cập nhật `REGISTERED_ATTESTERS` với 11 địa chỉ

### Lưu ý quan trọng
- Edge functions hiện tại (`pplp-authorize-mint`, `pplp-batch-lock`) vẫn giữ nguyên cho backward compatibility
- `pplp-mint-fun` là edge function MỚI cho flow multisig
- Cần đăng ký 11 địa chỉ trên contract qua `govRegisterAttester()` và set `attesterThreshold = 3` — việc này thực hiện ngoài code (trên BSC Testnet bởi guardianGov)

### Thứ tự triển khai
1. Database migration (thêm cột + RLS + Realtime)
2. GOV Groups config file
3. Edge Function `pplp-mint-fun`
4. Frontend hooks (`useAttesterSigning`, `useMintSubmit`)
5. Attester Panel UI + route
6. Cập nhật Admin Mint Approval

