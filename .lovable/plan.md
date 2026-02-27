

## Kế hoạch: Bổ sung Cơ chế Tính Thưởng & Mint FUN Money (PPLP Bài 7 Bonus)

Triển khai 4 lớp nhân mới trong công thức PPLP Score, cơ chế mint theo chu kỳ, và 3 lớp bảo vệ chống Ego.

---

### Bước 1: Database Migration — Thêm cột & bảng mới

| # | Đối tượng | Mô tả |
|---|-----------|-------|
| 1 | Thêm cột `reputation_weight`, `consistency_multiplier`, `integrity_penalty` vào `pplp_scores` | Lưu 3 lớp nhân mới cho mỗi lần chấm điểm |
| 2 | Thêm cột `contribution_days_30`, `contribution_days_90` vào `pplp_user_tiers` | Đếm ngày đóng góp liên tục (30/90 ngày) để tính Consistency Multiplier |
| 3 | Tạo bảng `pplp_mint_cycles` | Chu kỳ mint theo tuần/tháng: `cycle_id`, `start_date`, `end_date`, `total_mint_pool`, `total_light_contribution`, `status` (open/closed/distributed) |
| 4 | Tạo bảng `pplp_mint_allocations` | Phân bổ từng user trong chu kỳ: `cycle_id`, `user_id`, `user_light_contribution`, `allocation_ratio`, `fun_allocated`, `status` |
| 5 | Hàm RPC `calculate_reputation_weight(_user_id)` | Tính Reputation Weight dựa trên: thời gian đóng góp, lịch sử không vi phạm, số chuỗi hoàn thành, cross-platform contribution |
| 6 | Hàm RPC `calculate_consistency_multiplier(_user_id)` | Trả về hệ số: 1.0 (mặc định), 1.3 (30 ngày ổn định), 1.6 (90 ngày ổn định) |

### Bước 2: Cập nhật Edge Function `pplp-score-action`

| # | Thay đổi | Mô tả |
|---|----------|-------|
| 1 | Gọi `calculate_reputation_weight()` | Sau bước 5 (threshold check), lấy reputation weight của actor |
| 2 | Gọi `calculate_consistency_multiplier()` | Lấy consistency multiplier |
| 3 | Tính `integrity_penalty` | Dựa trên fraud signals (spam, đánh giá chéo, tương tác giả) — giảm điểm chậm, bền, minh bạch |
| 4 | Áp dụng công thức mới | `finalReward = baseReward × Q × I × K × reputationWeight × consistencyMultiplier × sequenceBonus − integrityPenalty` |
| 5 | Lưu 3 giá trị mới vào `pplp_scores` | `reputation_weight`, `consistency_multiplier`, `integrity_penalty` |

### Bước 3: Edge Function mới `process-mint-cycle`

| # | Chức năng |
|---|-----------|
| 1 | Tổng hợp tổng Light Value toàn hệ trong chu kỳ |
| 2 | Xác định Mint Pool (giới hạn cung tăng từ từ — ví dụ 5M FUN/tuần max) |
| 3 | Phân bổ theo tỷ lệ: `FUN = MintPool × (userContribution / totalContribution)` |
| 4 | Ghi vào `pplp_mint_allocations` |

### Bước 4: Lớp bảo vệ chống Ego (Frontend)

| # | Thay đổi | Mô tả |
|---|----------|-------|
| 1 | Cập nhật `LightLevelBadge` | Chỉ hiển thị tên tầng (Light Stable / Growing / Builder / Guardian) — không hiển thị số điểm chính xác công khai |
| 2 | Cập nhật `Leaderboard` | Thay bảng xếp hạng cạnh tranh (Top 1–2) bằng xu hướng tăng trưởng cá nhân. Hiển thị Light Level thay vì điểm số |
| 3 | Thêm `MintCycleStatus` component | Hiển thị chu kỳ mint hiện tại, thời gian còn lại, tỷ lệ phân bổ dự kiến — nhấn mạnh "mint không tức thì" |
| 4 | Cập nhật trang `/mint` | Thêm section giải thích 3 lớp thưởng (Light Score / Mint Eligibility / FUN Money Flow) và thông tin chu kỳ mint |

### Bước 5: Cập nhật tài liệu

| # | Tệp | Mô tả |
|---|-----|-------|
| 1 | `docs/PPLP_REWARD_MECHANISM.md` | Tài liệu đầy đủ về công thức PPLP Score mới (4 lớp nhân), chu kỳ mint, 3 lớp bảo vệ chống Ego, và kết nối Camly Coin ↔ FUN Money |

---

### Chi tiết kỹ thuật

**Công thức PPLP Score hoàn chỉnh:**
```text
PPLP Score = (5 Pillars × Community Score)
           × Reputation Weight      [0.5 – 1.5]
           × Consistency Multiplier  [1.0 / 1.3 / 1.6]
           × Sequence Multiplier     [1.0 – 3.0]
           − Integrity Penalty       [0 – 50%]
```

**Reputation Weight tính theo:**
- Thời gian đóng góp (ngày kể từ hành động đầu tiên)
- Tỷ lệ pass/fail (lịch sử không vi phạm)
- Số chuỗi hoàn thành (`completed_sequences`)
- `trust_score` từ `pplp_user_tiers`

**Consistency Multiplier:**
```text
< 30 ngày đóng góp  → x1.0
≥ 30 ngày ổn định   → x1.3
≥ 90 ngày ổn định   → x1.6
```

**Integrity Penalty (giảm chậm, bền, minh bạch):**
- Spam tinh vi: −10%
- Đánh giá chéo: −15%
- Tương tác giả: −20%
- Lạm dụng cảm xúc: −10%
- Tích lũy, không quá 50%

**Chu kỳ Mint:**
```text
FUN Minted(user) = MintPool(cycle) × (user_light_contribution / total_light_contribution)
```

