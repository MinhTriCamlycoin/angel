

# Khắc phục Angel AI bị cắt ngang câu trả lời

## Vấn đề

Hiện tại `max_tokens` bị giới hạn cứng theo style:
- `detailed`: 2500 tokens
- `balanced`: 1500 tokens  
- `concise`: 600 tokens
- `creative`: 1200 tokens

Khi câu hỏi cần kiến thức dài (ví dụ giải thích Cosmic Intelligence, hướng dẫn chi tiết), 2500 tokens không đủ → AI bị cắt giữa chừng, câu trả lời dang dở.

## Giải pháp

### 1. Tăng `max_tokens` cho tất cả styles trong `angel-chat/index.ts`

```text
detailed:  2500 → 8000
balanced:  1500 → 4000  
concise:    600 → 1500
creative:  1200 → 4000
```

### 2. Tăng `max_tokens` cho `generate-content/index.ts`

```text
2000 → 8000
```

### 3. Cập nhật instruction cho style `detailed`

Thêm hướng dẫn: "Luôn hoàn thành trọn vẹn câu trả lời, không bao giờ dừng giữa chừng. Nếu nội dung dài, hãy viết đầy đủ đến kết luận."

### 4. Thêm system-level instruction vào `BASE_SYSTEM_PROMPT`

Thêm rule: "CRITICAL: ALWAYS complete your response fully. Never stop mid-sentence or mid-paragraph. If the topic requires a long explanation, provide it completely."

## Tác động

- Không ảnh hưởng UI hay frontend
- Chi phí API tăng nhẹ (chỉ khi câu trả lời thực sự dài)
- `max_tokens` là giới hạn trên, không phải bắt buộc dùng hết

## Files cần sửa

1. `supabase/functions/angel-chat/index.ts` — tăng maxTokens + thêm instruction
2. `supabase/functions/generate-content/index.ts` — tăng max_tokens

