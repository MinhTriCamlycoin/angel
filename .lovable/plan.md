

# Thêm kiến thức kỹ thuật Angel AI vào System Prompt

## Vấn đề

`BASE_SYSTEM_PROMPT` trong `supabase/functions/angel-chat/index.ts` hiện chỉ có hướng dẫn về persona, brand, tone — nhưng **không có kiến thức kỹ thuật** về cách sử dụng nền tảng Angel AI. Khi user hỏi "làm sao rút Camly Coin?" hoặc "mint FUN Money thế nào?", Angel AI không có thông tin để hướng dẫn chính xác.

## Giải pháp

Thêm một section **TECHNICAL KNOWLEDGE BASE** vào cuối `BASE_SYSTEM_PROMPT` (trước dòng đóng backtick), bao gồm các hướng dẫn kỹ thuật chi tiết:

### Nội dung kiến thức cần thêm

1. **Rút Camly Coin (Withdrawal)**
   - Vào trang Earn → mục "Rút thưởng"
   - Điều kiện: tối thiểu 200,000 / tối đa 500,000 Camly Coin mỗi ngày
   - Yêu cầu: đã kết nối ví Web3, đã xác minh avatar, đã đăng 1 bài cộng đồng hoặc gratitude trong ngày
   - Quy trình: Nhập số lượng → Xác nhận → Admin duyệt → Giao dịch BSC tự động → Nhận notification thành công

2. **Mint FUN Money**
   - Quy trình 3 giai đoạn: Thiết lập (kết nối ví, xác minh profile) → Tích lũy Light Score → Nhận FUN theo chu kỳ Epoch
   - Light Score tích lũy từ: đăng bài, tương tác, gratitude, hoạt động hệ sinh thái
   - FUN Money được phân bổ theo Epoch, không mint tức thì
   - Admin ký chữ ký EIP-712, user claim on-chain

3. **Kết nối ví Web3**
   - Hỗ trợ MetaMask
   - Mạng BSC Testnet (Chain ID 97)
   - Hướng dẫn cài MetaMask và kết nối

4. **Hệ thống PPLP & Light Score**
   - 5 Pillars of Light
   - Light Level: Seed → Sprout → Bloom → Luminary → Architect
   - Cách tăng Light Score

5. **FUN Ecosystem tổng quan**
   - 12 nền tảng
   - FUN ID đăng nhập thống nhất
   - FUN Money vs Camly Coin (khác biệt)

6. **Các tính năng Angel AI**
   - Chat AI, tạo hình ảnh, phân tích ảnh
   - Earn, Community, Messaging
   - Public Profile

## File cần sửa

**`supabase/functions/angel-chat/index.ts`** — Thêm section kiến thức kỹ thuật vào `BASE_SYSTEM_PROMPT` (chèn trước dòng 506 - trước phần MISSION kết thúc prompt).

