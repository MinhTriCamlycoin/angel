

## Kế hoạch: Edge Function tính daily_light_score + cron job tự động

### Vấn đề hiện tại
- Bảng `features_user_day` có đầy đủ activity counts (posts, comments, logins, streaks...) nhưng `daily_light_score` luôn = 0
- Bảng `pplp_scores` có **17,925 scored actions** với avg light_score = 77.75 — dữ liệu thực tế đã có
- RPC `get_community_light_summary` dùng `SUM(daily_light_score)` → tất cả user đều = 0 → cùng Level 1
- Cần pipeline tính toán và ghi `daily_light_score` vào `features_user_day`, sau đó rollup vào `light_score_ledger`

### Giải pháp: 2 phần

**1. Edge Function `pplp-compute-daily-scores`**
- Lấy tất cả user có record trong `features_user_day` cho ngày hiện tại (hoặc ngày chỉ định)
- Với mỗi user, tính:
  - **base_action_score**: Dựa trên count_posts, count_comments, count_questions, count_journals, count_logins (mỗi loại có weight khác nhau)
  - **content_score**: Lấy avg pillar scores từ `pplp_scores` cho actions trong ngày đó, áp dụng `normalizeContentScore` + type_multiplier
  - **reputation_weight**: Dùng consistency_streak + pass_rate từ pplp_scores
  - **consistency_multiplier**: Từ consistency_streak đã có sẵn
  - **sequence_multiplier**: Từ sequence_count đã có sẵn
  - **integrity_penalty**: Từ anti_farm_risk đã có sẵn (normalize 0-1)
  - **daily_light_score**: `raw * consistency * sequence * integrity` theo LS-Math v1.0
- Ghi lại tất cả components vào `features_user_day`
- Upsert `light_score_ledger` cho period hiện tại (monthly) với SUM daily scores + determine level + trend

**2. Cron job chạy mỗi giờ**
- Gọi edge function `pplp-compute-daily-scores` tự động
- Đảm bảo scores luôn cập nhật khi user hoạt động trong ngày

### Công thức tính base_action_score (Enrichment strategy)

```text
base = (count_posts × 15) + (count_comments × 8) + (count_questions × 10)
     + (count_journals × 12) + (count_logins × 5) + (count_help × 20)
```

### Tệp cần tạo/sửa
- **Tạo** `supabase/functions/pplp-compute-daily-scores/index.ts` — Edge function chính
- **Tạo** cron job (SQL) gọi function mỗi giờ
- **Cập nhật** `supabase/config.toml` entry cho function mới (verify_jwt = false)

### Chi tiết kỹ thuật
- Sử dụng LS-Math v1.0 formulas từ `scoring-engine.ts` (reimplemented in Deno)
- anti_farm_risk normalize: `risk / 10` (giá trị thực tế thấy 0-4)
- Level determination: dựa trên cumulative SUM từ `pplp_light_levels`
- Trend: so sánh 7 ngày gần nhất vs 7 ngày trước đó

