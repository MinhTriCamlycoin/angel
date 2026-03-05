

# Báo cáo Kiểm toán Hệ thống Angel AI — 6 Lớp Chuẩn Chỉnh

## Tổng quan

Kiểm tra toàn bộ hệ thống PPLP + Light Score theo 6 tiêu chí chuẩn cho hệ mint dựa trên điểm. Kết quả: **4/6 lớp ĐẠT**, **2/6 lớp CẦN BỔ SUNG**.

---

## Lớp 1: Chống Gian Lận (Sybil-resistance) — ĐẠT ✅

**Hiện có 10 lớp bảo vệ:**
- Device fingerprint + IP hash → phát hiện SYBIL
- Content similarity (Jaccard 80%) → phát hiện farming
- Rate limiting (cooldown, max/day, max/week trong `pplp_action_caps`)
- Bot pattern detection (burst, temporal anomaly)
- Coordinated timing detection (`detect_coordinated_timing()`)
- Cross-account scan (cron 03:00 AM hàng ngày)
- Anti-Sybil module (`_shared/anti-sybil.ts`) — Account Age Gate 3 tầng
- Whitelist/Blacklist system
- Wallet locking (khóa vĩnh viễn sau kết nối)
- **Đã vượt 30/30 test cases** bao gồm mô phỏng tấn công hacker toàn diện

**Đánh giá:** Rất mạnh. Đa lớp, đã test thực chiến.

---

## Lớp 2: Tính Đúng & Nhất Quán (Correctness) — ĐẠT ✅

- `scoring_rules` table quản lý phiên bản luật (versioned)
- `pplp_action_caps` cấu hình base reward + multiplier ranges cho mỗi action type
- Pillar scores S/T/H/C/U có công thức deterministic, clip [0,100]
- Multipliers Q/I/K dùng linear interpolation trong ranges cố định
- `scoring-engine.ts` — pure functions, đã unit test 19 cases
- Idempotent: `pplp-score-action` trả kết quả cũ nếu action đã scored
- Reason codes + trend tracking cho audit trail

**Đánh giá:** Cùng hành vi → cùng điểm. Có phiên bản luật, không tính lại quá khứ.

---

## Lớp 3: Chống Thao Túng Dữ Liệu (Oracle Integrity) — CẦN BỔ SUNG ⚠️

**Đã có:**
- Edge functions dùng `service_role_key` (không phải client key)
- EIP-712 signed proof cho mỗi mint request (chống giả mạo on-chain)
- Nonce on-chain từ contract (`nonces(address)`) — chống replay on-chain
- Content hash trong evidence — chống duplicate

**Thiếu:**
1. **Stale Action Reject**: Memory ghi nhận "loại bỏ action > 24h" nhưng **không tìm thấy code thực thi** trong `pplp-score-action` hay `pplp-authorize-mint`. Action cũ vẫn có thể được score/mint.
2. **Off-chain event verification**: Pillar scores dựa vào metadata từ client (`content_length`, `sentiment_score`, `quality_score`). Client có thể gửi `content_length: 9999` để inflate điểm C. Không có server-side validation.
3. **Referral/social graph verification**: Chưa có cơ chế xác thực engagement thật (view, share count từ source of truth).

**Khuyến nghị:**
- Thêm stale action check: reject nếu `action.created_at < now() - 24h`
- Validate `content_length` server-side bằng cách đo `metadata.content` thực tế
- Thêm AI verification layer cho engagement metrics

---

## Lớp 4: Kinh Tế Bền Vững (Tokenomics) — ĐẠT ✅

- **Epoch-based minting**: FUN phân bổ theo tháng, không mint tức thì
- **Mint Pool cố định**: 1M → 3M → 5M FUN/tháng (cấu hình trong `mint_epochs`)
- **Anti-whale cap 3%**: Không ai nhận quá 3% pool (`computeMintAllocation`)
- **Cascading Distribution**: 4-tier (Genesis 1%, Platform 0.99%, Partners, User)
- **Eligibility gates**: L_min ≥ 10, no fraud severity ≥ 4, PPLP accepted
- **Diminishing returns**: `gamma = 1.3` penalize spam, `consistency beta` saturates

**Thiếu nhẹ:**
- Chưa có burn/recycle mechanism rõ ràng
- Chưa neo vào doanh thu thực (nhưng pool cố định nên kiểm soát được)

---

## Lớp 5: An Toàn Smart Contract (On-chain Security) — ĐẠT ✅

- Contract `FUNMoneyProductionV1_2_1` (0x39A1...0CD6) trên BSC Testnet
- **EIP-712 typed signatures**: Domain verification (name, version, chainId, verifyingContract)
- **Nonce-based replay protection**: `nonces(address)` on-chain
- **Attester verification**: `isAttester(address)` check before signing
- **Action registration**: `govRegisterAction` required before mint
- **RPC validation**: Chain ID check, block number sanity, contract code existence
- **Multiple RPC fallback**: 5 BSC Testnet endpoints with timeout

**Lưu ý:** Đang trên Testnet. Cần audit chuyên nghiệp khi deploy Mainnet.

---

## Lớp 6: Vận Hành An Toàn (Ops/Governance) — CẦN BỔ SUNG ⚠️

**Đã có:**
- **Mint Pause**: Admin toggle pause toàn hệ thống (`system_settings.mint_system`)
- **Multisig 3-of-3**: WILL, WISDOM, LOVE attesters (app-level)
- **Attester Panel**: Restricted to 11 GOV addresses
- **Guardian wallet**: `guardianGov()` on contract
- **Suspension system**: Auto-reject mint for banned users
- **Realtime monitoring**: Fraud alerts, cron jobs (8 pipelines)
- **Admin dashboards**: Treasury, Fraud Alerts, Trust List, Contract Status

**Thiếu:**
1. **Timelock**: Không có delay cho admin actions quan trọng (change scoring rules, modify pool size). Admin thay đổi tức thì.
2. **Emergency key rotation**: Nếu `ATTESTER_PRIVATE_KEY` bị lộ, chưa có quy trình rotate.
3. **Incident response playbook**: Chưa có tài liệu quy trình ứng phó sự cố.
4. **On-chain attester threshold**: Đang để `attesterThreshold = 1` (app-level enforce 3-of-3, nhưng bypass được nếu gọi trực tiếp contract).

---

## Kế Hoạch Khắc Phục (2 lớp thiếu)

### Ưu tiên A: Oracle Integrity — 3 tasks

1. **Thêm Stale Action Reject** vào `pplp-score-action`: Reject action có `created_at > 24h`. Khoảng 10 dòng code trong edge function.

2. **Server-side content length validation**: Trong `pplp-score-action`, tính `content_length` từ `metadata.content` thực tế thay vì tin client gửi. Khoảng 15 dòng.

3. **Test cases cho oracle integrity**: Thêm 4-5 test cases mô phỏng inflated metadata, stale action, replay attempt.

### Ưu tiên B: Ops Safety — 2 tasks

4. **Scoring Rules Timelock**: Thêm `effective_after` timestamp vào `scoring_rules` — rule mới chỉ active sau 48h. Migration + edge function update.

5. **Nâng attester threshold on-chain**: Gọi `govSetAttesterThreshold(3)` khi đủ 3 attester keys. Đảm bảo contract-level enforce khớp app-level.

### Tổng: 5 tasks, ước tính 2-3 sessions

---

## Bảng Tổng Kết

```text
┌──────────────────────────────────┬──────────┬───────────┐
│ Lớp                             │ Trạng thái│ Điểm      │
├──────────────────────────────────┼──────────┼───────────┤
│ 1. Sybil Resistance             │ ✅ ĐẠT   │ 9.5/10    │
│ 2. Correctness & Consistency    │ ✅ ĐẠT   │ 9.0/10    │
│ 3. Oracle / Data Integrity      │ ⚠️ THIẾU │ 6.5/10    │
│ 4. Tokenomics Sustainability    │ ✅ ĐẠT   │ 8.5/10    │
│ 5. Smart Contract Security      │ ✅ ĐẠT   │ 8.0/10    │
│ 6. Ops / Governance Safety      │ ⚠️ THIẾU │ 7.0/10    │
├──────────────────────────────────┼──────────┼───────────┤
│ TỔNG                            │          │ 48.5/60   │
└──────────────────────────────────┴──────────┴───────────┘
```

