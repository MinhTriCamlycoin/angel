

## Plan: Tạo hướng dẫn Mint FUN Money từ A đến Z

Thay thế phần hướng dẫn 4 bước hiện tại (chỉ Activate & Claim) bằng hướng dẫn toàn diện 8 bước, bao gồm toàn bộ quy trình từ đăng ký tài khoản đến nhận FUN Money về ví.

### Thay đổi

| # | File | Mô tả |
|---|------|-------|
| 1 | `src/components/mint/MintGuideFullFlow.tsx` | Component mới: hướng dẫn 8 bước A-Z với stepper, icon, collapsible |
| 2 | `src/pages/Mint.tsx` | Thay Collapsible guide cũ bằng `MintGuideFullFlow` |

### 8 bước hướng dẫn

1. **Đăng ký & đăng nhập** Angel AI (email/Google)
2. **Cài MetaMask** + thêm mạng BSC Testnet (Chain ID 97)
3. **Lấy tBNB miễn phí** từ faucet để trả gas
4. **Lưu địa chỉ ví** vào Profile trên Angel AI
5. **Thực hiện Light Actions** (chat, đăng bài, nhật ký, tặng quà...)
6. **Gửi yêu cầu Mint** — nhấn "Gửi tất cả yêu cầu mint" sau khi đạt Light Score >= 60
7. **Chờ Admin duyệt** — FUN được lock on-chain sau khi admin ký EIP-712
8. **Activate → Claim** — 2 giao dịch MetaMask để nhận FUN về ví

Mỗi bước có icon, mô tả ngắn, và tips/links hành động (faucet, BscScan, trang Profile...). Stepper hiển thị dọc với connecting line, collapsible để user có thể thu gọn.

### Chi tiết kỹ thuật

- Component nhận props optional `defaultOpen` (mặc định `true`)
- Mỗi step có `status` visual: số thứ tự với màu gradient theo giai đoạn (xanh dương cho setup, vàng cho earn, xanh lá cho claim)
- Giữ nguyên nút "Lấy tBNB miễn phí" và link BscScan
- Thêm link nội bộ đến `/profile` (lưu ví), `/community` (đăng bài), `/chat` (chat Angel AI)
- Contract address `0x39A1...0CD6` hiển thị với link BscScan để user add token vào MetaMask

