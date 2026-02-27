# 💎 PPLP Reward Mechanism — Cơ chế Tính Thưởng & Mint FUN Money

> Tài liệu kỹ thuật v2.0 — Triển khai Bài 7 Bonus PPLP  
> Cập nhật: 2026-02-27

---

## 0) Phân biệt 3 Lớp Thưởng

| Lớp | Tên | Mô tả |
|-----|-----|-------|
| 1 | **Light Score** | Thước đo năng lượng & hành vi — không đồng nghĩa quyền mint |
| 2 | **Mint Eligibility** | Điều kiện mint dựa trên Reputation, Consistency, Integrity |
| 3 | **FUN Money Flow** | Mint theo chu kỳ, phân bổ theo giá trị thật toàn hệ |

---

## 1) Công thức PPLP Score hoàn chỉnh

```
PPLP Score = (5 Pillars × Community Score)
           × Reputation Weight      [0.5 – 1.5]
           × Consistency Multiplier  [1.0 / 1.3 / 1.6]
           × Sequence Multiplier     [1.0 – 3.0]
           − Integrity Penalty       [0 – 50%]
```

### 1.1 Reputation Weight (0.5 – 1.5)

Tính theo 4 yếu tố:
- **Thời gian đóng góp**: max +0.25 cho 180 ngày hoạt động
- **Tỷ lệ pass/fail**: max +0.30 cho 100% pass rate
- **Chuỗi hoàn thành**: max +0.20 cho 20+ chuỗi completed
- **Trust score**: max +0.25 cho trust_score = 100

RPC: `calculate_reputation_weight(_user_id UUID) → NUMERIC`

### 1.2 Consistency Multiplier

| Điều kiện | Multiplier |
|-----------|------------|
| < 20 ngày đóng góp / 30 ngày | ×1.0 |
| ≥ 20 ngày / 30 ngày (67%+) | ×1.3 |
| ≥ 60 ngày / 90 ngày (67%+) | ×1.6 |

RPC: `calculate_consistency_multiplier(_user_id UUID) → NUMERIC`

### 1.3 Sequence Multiplier (1.0 – 3.0)

Đã triển khai qua `detect_behavior_sequences()`. Chi tiết trong [LIGHT_SCORE_ACTIVITIES.md](./LIGHT_SCORE_ACTIVITIES.md).

### 1.4 Integrity Penalty (0 – 50%)

| Vi phạm | Penalty |
|---------|---------|
| Spam tinh vi | −10% |
| Đánh giá chéo (cross-account) | −15% |
| Tương tác giả (fake engagement) | −20% |
| Lạm dụng cảm xúc | −10% |
| **Tích lũy tối đa** | **−50%** |

Penalty được tính từ `pplp_fraud_signals` (is_resolved = false).

---

## 2) Cơ chế Mint theo Chu kỳ

### Chu kỳ Mint

```
FUN Minted(user) = MintPool(cycle) × (user_contribution / total_contribution)
```

- **MintPool max**: 5,000,000 FUN/tuần
- **Chu kỳ**: Weekly (mặc định), có thể chuyển Monthly
- **Status flow**: `open → closed → distributed`

### Database Schema

```sql
pplp_mint_cycles (
  id, cycle_number, cycle_type, start_date, end_date,
  total_mint_pool, total_light_contribution, status
)

pplp_mint_allocations (
  id, cycle_id, user_id, user_light_contribution,
  allocation_ratio, fun_allocated, status
)
```

### Edge Function: `process-mint-cycle`

1. Tổng hợp tổng Light Value toàn hệ trong chu kỳ
2. Xác định Mint Pool (capped tại 5M FUN/tuần)
3. Phân bổ FUN theo tỷ lệ đóng góp thực
4. Ghi vào `pplp_mint_allocations`

---

## 3) 3 Lớp Bảo vệ chống Ego

### 3.1 Không hiển thị điểm chính xác công khai

`LightLevelBadge` chỉ hiển thị:
- Tên tầng: Light Stable / Growing / Builder / Guardian / Architect
- Progress bar (không số)

### 3.2 Không bảng xếp hạng cạnh tranh

Leaderboard chuyển sang hiển thị:
- Light Level thay vì điểm số
- Xu hướng tăng trưởng cá nhân

### 3.3 Mint không tức thì

`MintCycleStatus` component hiển thị:
- Chu kỳ mint hiện tại & thời gian còn lại
- Phân bổ dự kiến
- Thông điệp: "Mint theo chu kỳ, không theo cảm xúc"

---

## 4) Kết nối Camly Coin ↔ FUN Money

| Token | Vai trò | Ẩn dụ |
|-------|---------|-------|
| **FUN Money** | Chuẩn giá trị, mint theo PPLP | ☀️ Mặt Trời |
| **Camly Coin** | Utility nội bộ, phí tính năng, boost | 🌊 Dòng Nước |

- FUN Money mint theo PPLP Score
- Camly Coin dùng làm utility: phí nâng cao, boost visibility, staking tăng Reputation Weight
- **FUN dẫn đến đâu → Camly chạy theo đến đó**

---

## 5) Triết lý cốt lõi

> "PPLP không tạo ra người nổi tiếng. PPLP tạo ra người có giá trị."
>
> "FUN Money không chảy về nơi ồn ào. FUN Money chảy về nơi có nhịp sống tử tế và bền vững."

---

## 6) Files liên quan

| File | Mô tả |
|------|-------|
| `supabase/functions/pplp-score-action/index.ts` | Engine chấm điểm v2 (có reputation, consistency, integrity) |
| `supabase/functions/process-mint-cycle/index.ts` | Xử lý chu kỳ mint |
| `src/hooks/useMintCycle.ts` | Hook frontend cho chu kỳ mint |
| `src/components/pplp/MintCycleStatus.tsx` | UI chu kỳ mint |
| `src/components/pplp/ThreeLayerRewardExplainer.tsx` | UI giải thích 3 lớp thưởng |
| `src/components/pplp/LightLevelBadge.tsx` | Badge chỉ hiển thị tên tầng (không điểm) |
