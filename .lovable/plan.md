

# Kế hoạch: Chuyển sang mô hình Hybrid — Light Score per-action, FUN theo Epoch

## Tóm tắt

Sau mỗi action, user thấy "+X Light Score" (phản hồi tức thì). FUN Money chỉ được mint cuối epoch (tháng) dựa trên tỷ lệ Light Score trong pool.

## Thay đổi cần thực hiện

### 1. Sửa `pplp-score-action/index.ts` — Loại bỏ Q×I×K FUN reward

**Hiện tại (dòng 354-362):**
```typescript
const rawReward = baseReward * multipliers.Q * multipliers.I * multipliers.K;
const weightedReward = rawReward * reputationWeight * consistencyMultiplier;
const finalReward = weightedReward - (weightedReward * integrityPenalty/100);
```

**Thay bằng:**
```typescript
// Hybrid: final_reward = 0 (FUN chỉ mint theo epoch)
// Light Score contribution = lightScore * reputationWeight * consistencyMultiplier * (1 - penalty)
const lightContribution = lightScore * reputationWeight * consistencyMultiplier * (1 - integrityPenalty/100);
const finalReward = 0; // FUN không tính per-action nữa
```

- Giữ nguyên Q, I, K trong `pplp_scores` để audit/history
- `final_reward` = 0 cho mọi action mới
- Thêm cột `light_contribution` vào response để frontend hiển thị
- Loại bỏ toàn bộ phần auto-mint (section 11, dòng 680-807) — chuyển thành comment/skip

### 2. Sửa `_shared/pplp-helper.ts` — `submitAndScorePPLPAction` response

- Response trả về `light_contribution` thay vì `reward` (FUN)
- Frontend hiển thị: "Bạn đã đóng góp +X Light Score ✨" thay vì "+X FUN"

### 3. Sửa frontend hooks

**`useFUNMoneyStats.ts`:**
- Thay đổi nguồn dữ liệu: FUN Money lấy từ `mint_allocations` (epoch-based) thay vì sum `pplp_scores.final_reward`
- `totalScored` → FUN từ epoch allocation chưa mint
- `totalMinted` → FUN đã mint on-chain

**`usePPLPScore.ts`:**
- Thêm `light_contribution` vào interface `PPLPScoreData`
- Hiển thị Light Score contribution thay vì FUN reward

### 4. Sửa các UI hiển thị reward sau action

Tìm các nơi hiển thị "+X FUN" sau action (toast notifications, chat reward display) → đổi thành "+X Light Score ✨"

### 5. Đảm bảo epoch pipeline hoạt động

- `pplp-epoch-reset` + `pplp-epoch-allocate` đã tồn tại và sử dụng `light_score_ledger` → tính FUN allocation cuối tháng
- Xác nhận `mint_epochs` và `mint_allocations` tables đang được populate đúng

## Tác động dữ liệu

| Trước | Sau |
|-------|-----|
| Mỗi action → `final_reward` = 65-227 FUN | Mỗi action → `final_reward` = 0, `light_contribution` = 55-75 |
| User thấy "+97 FUN" | User thấy "+62.5 Light Score ✨" |
| FUN mint per-action (via approve) | FUN mint cuối tháng (epoch allocation) |
| ~1,700,000 FUN/2 tháng phát tán | 5,000,000 FUN/tháng pool, chia theo tỷ lệ |

## Files thay đổi
1. `supabase/functions/pplp-score-action/index.ts` — loại bỏ FUN calculation, giữ Light Score
2. `supabase/functions/_shared/pplp-helper.ts` — response type đổi reward → light_contribution
3. `src/hooks/useFUNMoneyStats.ts` — lấy FUN từ mint_allocations
4. `src/hooks/usePPLPScore.ts` — thêm light_contribution
5. Frontend toasts/notifications — đổi "+X FUN" → "+X Light Score"

