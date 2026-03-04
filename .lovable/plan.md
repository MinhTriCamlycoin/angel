

# Kiểm tra & Mô phỏng tấn công hệ thống PPLP + Light Score

## Tổng quan hiện trạng

Hệ thống PPLP hiện có **0 bài test tự động**. Toàn bộ logic scoring, fraud detection, và mint authorization chưa được kiểm thử bằng code. Đây là rủi ro lớn.

## Kế hoạch: 3 bộ test

### Test Suite 1: Scoring Engine (Unit Tests — Frontend)
**File:** `src/lib/__tests__/scoring-engine.test.ts`

Kiểm tra pure functions trong `scoring-engine.ts`:
- Reputation Weight: clip đúng [0.5, 2.0], log scaling
- Content Score: gamma normalization, type multipliers  
- Consistency Multiplier: streak 0 → 1.0, streak 30 → ~1.36
- Sequence Multiplier: tanh saturation
- Integrity Penalty: cap 50%, scaling θ=0.8
- Daily Light Score: kết hợp đúng ω_B=0.4, ω_C=0.6
- Mint Allocation: anti-whale cap 3%
- Eligibility: PPLP not accepted, high risk, low score, unresolved review

### Test Suite 2: Edge Function — pplp-score-action (Integration Test)
**File:** `supabase/functions/pplp-score-action/index.test.ts`

Gọi edge function thực tế qua HTTP:
- Action không tồn tại → 404
- Action đã scored → idempotent response
- Missing action_id → 400
- Validate response schema (pillar scores, multipliers, decision)

### Test Suite 3: Mô phỏng tấn công Hacker (Security Tests)
**File:** `supabase/functions/pplp-detect-fraud/index.test.ts`

Mô phỏng các kịch bản tấn công thực tế:
1. **Sybil Attack**: Gửi device_hash trùng → phải phát hiện SYBIL signal
2. **Bot Spam**: Gửi action_type lặp lại nhanh → phải phát hiện BOT signal  
3. **Content Farming**: Gửi content_hash trùng → phải phát hiện SPAM signal
4. **Collusion Ring**: Tập trung tương tác 1 target → phải phát hiện COLLUSION
5. **Whitelist Bypass**: User whitelisted → risk_score = 0, bỏ qua mọi check
6. **Missing actor_id** → 400 error

## Chi tiết kỹ thuật

- Unit tests chạy qua `vitest` (đã cấu hình sẵn)
- Edge function tests chạy qua Deno test runner, dùng `dotenv/load.ts` để load `.env`
- Tất cả tests gọi functions thật (deployed) — không mock
- Response body luôn được consume (`await response.text()`) để tránh resource leak

## Tổng cộng: ~25-30 test cases

