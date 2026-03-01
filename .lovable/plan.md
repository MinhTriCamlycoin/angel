

## Báo cáo: Hệ thống PPLP CHƯA reset theo tháng mới

### Vấn đề phát hiện

Theo spec **LS-Math v1.0**, mỗi tháng (epoch) là một chu kỳ đánh giá mới. Tuy nhiên, hệ thống hiện tại **không có cơ chế reset** nào khi sang tháng mới.

### Bằng chứng cụ thể

| Bảng | Vấn đề |
|---|---|
| `user_light_totals` | `total_points` = `lifetime_points` (100% giống nhau cho tất cả user). Không phân biệt điểm tháng này vs tích lũy. **Không bao giờ reset.** |
| `features_user_day` | Dữ liệu ngày 2026-03-01 đã có nhưng `daily_light_score = 0` cho tất cả (cron chưa chạy tính điểm). Dữ liệu tháng cũ vẫn nằm chung, không tách epoch. |
| `light_score_ledger` | **Trống hoàn toàn** — 0 records. Nghĩa là cron `pplp-compute-daily-scores` chưa bao giờ rollup thành công vào ledger. |
| `pplp_mint_cycles` | **Trống** — Chưa có chu kỳ mint nào được tạo. |
| `pplp_user_caps` | Dữ liệu cuối cùng ngày 2026-02-27. Tháng 3 chưa có record mới (caps tự reset theo ngày, OK). |
| `daily_login_tracking` | `streak_count` tiếp tục tích lũy qua tháng (41 ngày streak). Đây là **đúng thiết kế** — streak không reset theo epoch. |

### Nguyên nhân gốc

1. **Không có Edge Function / Cron nào chạy vào đầu tháng** để:
   - Archive `features_user_day` tháng cũ
   - Reset `user_light_totals.total_points` về 0 (giữ `lifetime_points`)
   - Tạo `pplp_mint_cycles` record mới cho tháng 3
   - Finalize `light_score_ledger` cho tháng 2

2. **`pplp-compute-daily-scores` có logic rollup ledger** (dòng 192-252) nhưng:
   - `light_score_ledger` trống → logic chưa bao giờ chạy thành công, hoặc cron chưa được schedule

3. **`user_light_totals.total_points` được cộng dồn mãi** — không có code nào phân biệt "điểm tháng này" vs "điểm tích lũy"

### Kế hoạch sửa

**Bước 1: Tạo Edge Function `pplp-epoch-reset`**
- Chạy vào ngày 1 hàng tháng (cron: `0 0 1 * *`)
- Logic:
  - Finalize `light_score_ledger` cho tháng trước (tổng hợp từ `features_user_day`)
  - Reset `user_light_totals.total_points = 0` (giữ nguyên `lifetime_points`, `popl_score`)
  - Tạo `pplp_mint_cycles` record mới cho tháng mới (status: 'open')
  - Đóng cycle cũ (status: 'closed')

**Bước 2: Chạy reset thủ công cho tháng 3/2026**
- Vì hôm nay đã là 2026-03-01 và chưa có cron, cần chạy 1 lần thủ công:
  - INSERT vào `light_score_ledger` tổng hợp tháng 2
  - UPDATE `user_light_totals` SET `total_points = 0`
  - INSERT `pplp_mint_cycles` cho Cycle #1 (tháng 3)

**Bước 3: Schedule cron job**
- Dùng `pg_cron` để gọi Edge Function `pplp-epoch-reset` vào 00:00 UTC ngày 1 hàng tháng

**Bước 4: Sửa frontend hiển thị**
- `useLightPoints.ts` (dòng 92): hiển thị `total_points` (điểm tháng) thay vì `lifetime_points`
- Thêm label rõ ràng: "Điểm tháng này" vs "Điểm tích lũy"

### Không thay đổi

- `daily_login_tracking.streak_count` — tiếp tục tích lũy (đúng spec: streak là consistency dài hạn)
- `camly_coin_balances` — không reset (tiền thật)
- `pplp_user_caps` — đã tự reset theo ngày (OK)
- `popl_score` — reputation score dài hạn, không reset

