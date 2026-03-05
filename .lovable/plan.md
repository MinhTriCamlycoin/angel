

# Huấn luyện Angel AI đọc và tạo code

## Vấn đề

Hiện tại `BASE_SYSTEM_PROMPT` trong `supabase/functions/angel-chat/index.ts` không có hướng dẫn nào về khả năng lập trình. Khi user hỏi Angel AI viết code hoặc giải thích code, AI không có ngữ cảnh rõ ràng để trả lời đúng cách — không biết format code block, không biết hỗ trợ ngôn ngữ nào, không có best practices.

## Giải pháp

Thêm section **CODE GENERATION & READING** vào `BASE_SYSTEM_PROMPT` (sau TECHNICAL KNOWLEDGE BASE, trước MISSION — khoảng trước dòng 681), bao gồm:

### Nội dung kiến thức cần thêm

**1. Năng lực lập trình cốt lõi:**
- Đọc, phân tích, giải thích code bất kỳ ngôn ngữ nào
- Viết code hoàn chỉnh, sẵn sàng chạy (không viết code dở)
- Debug, tìm lỗi, đề xuất sửa
- Refactor, tối ưu hóa code

**2. Ngôn ngữ & Framework hỗ trợ:**
- Frontend: HTML, CSS, JavaScript, TypeScript, React, Vue, Angular, Svelte, Next.js, Tailwind CSS
- Backend: Node.js, Python, Go, Rust, Java, PHP, Ruby, C#
- Mobile: React Native, Flutter, Swift, Kotlin
- Database: SQL, PostgreSQL, MySQL, MongoDB, Supabase
- Blockchain: Solidity, Web3.js, Ethers.js
- DevOps: Docker, GitHub Actions, CI/CD
- AI/ML: Python (TensorFlow, PyTorch), LangChain, Prompt Engineering

**3. Quy tắc viết code:**
- Luôn wrap code trong markdown code blocks với syntax highlighting (```language)
- Viết comments giải thích bằng tiếng Việt hoặc tiếng Anh tùy ngữ cảnh
- Code phải hoàn chỉnh, chạy được, không bỏ dở với "// ..."
- Khi user paste code → phân tích, giải thích từng phần, chỉ ra vấn đề
- Khi user yêu cầu tạo dự án → cung cấp cấu trúc file, từng file code, hướng dẫn setup
- Đề xuất best practices, security, performance khi phù hợp

**4. Phong cách hỗ trợ code:**
- Giải thích code rõ ràng, dễ hiểu cho mọi cấp độ (beginner → senior)
- Khi sửa code: chỉ rõ dòng nào sửa, tại sao sửa
- Gợi ý cải thiện thêm sau khi hoàn thành yêu cầu chính
- Hỗ trợ kiến trúc dự án, thiết kế database, API design

## File cần sửa

**`supabase/functions/angel-chat/index.ts`** — Chèn section mới vào `BASE_SYSTEM_PROMPT` trước dòng 681 (trước section MISSION).

## Lưu ý

- Không thay đổi logic xử lý hay streaming — chỉ mở rộng system prompt
- Angel AI vốn đã dùng model Gemini 2.5 Flash có khả năng code mạnh — chỉ cần "unlock" qua prompt
- maxTokens đã đủ lớn (8000) cho các response code dài

