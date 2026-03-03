

# Thống kê chi tiết: Mỗi Action được bao nhiêu FUN?

## Mô hình hiện tại (Hybrid Model)

Theo mô hình Hybrid hiện hành, **mỗi action KHÔNG trực tiếp mint FUN**. Thay vào đó:
1. Mỗi action tạo ra **Light Score** (đóng góp vào tổng tích lũy tháng)
2. Cuối Epoch (tháng), FUN Money được phân bổ theo tỷ lệ: `FUN_user = Pool × (Light_user / Light_total)`

Tuy nhiên, trường `final_reward` trong DB hiện **vẫn ghi nhận giá trị khác 0** (tính theo công thức `base_reward × Q × I × K × consistency`). Đây là **ước tính FUN tương đương** cho mỗi action, dùng để hiển thị cho user biết giá trị đóng góp.

---

## Bảng thống kê đầy đủ từ dữ liệu thực tế

### A. Cấu hình Base Reward (Policy v1.0.1)

| Action Type | Base Reward | Nền tảng | Max/ngày | Có trong DB caps? |
|---|---|---|---|---|
| MENTOR_HELP | 150 | FUN Profile | — | Có (150) |
| IDEA_SUBMIT | 150 | FUN Profile | — | Không |
| HELP_COMMUNITY | 120 | FUN Profile | — | Không |
| DONATE_SUPPORT | 120 | FUN Charity | — | Không |
| POST_CREATE | 70 | FUN Profile | — | **Không** |
| CONTENT_CREATE | 70 | FUN Profile | 5 | Có (70) |
| FEEDBACK_GIVE | 60 | Angel AI | — | Không |
| QUESTION_ASK | 50 | Angel AI | 10 | Có (50) |
| COMMENT_CREATE | 40 | FUN Profile | — | **Không** |
| POST_ENGAGEMENT | 40 | FUN Profile | — | **Không** |
| SHARE_CONTENT | 40 | FUN Profile | — | **Không** |
| JOURNAL_WRITE | 20 | FUNLife | — | **Không** |
| GRATITUDE_PRACTICE | 20 | FUNLife | — | **Không** |

### B. Thống kê thực tế (từ dữ liệu production)

| Action Type | Tổng actions | Đạt (pass) | Thất bại | Avg Light | Avg FUN (pass) | Min FUN | Max FUN | Tổng FUN |
|---|---|---|---|---|---|---|---|---|
| QUESTION_ASK | 11,389 | 9,165 (80%) | 2,224 | 78.0 | 82 | 47 | 256 | 749,736 |
| POST_CREATE | 4,033 | 3,962 (98%) | 71 | 81.1 | 139 | 95 | 216 | 551,779 |
| COMMENT_CREATE | 2,475 | 2,475 (100%) | 0 | 80.4 | 75 | 29 | 105 | 185,837 |
| GRATITUDE_PRACTICE | 1,649 | 996 (60%) | 653 | 69.9 | 39 | 26 | 58 | 38,593 |
| DONATE_SUPPORT | 273 | 273 (100%) | 0 | 79.8 | 227 | 114 | 300 | 61,964 |
| JOURNAL_WRITE | 36 | 34 (94%) | 2 | 83.4 | 43 | 41 | 56 | 1,459 |
| POST_ENGAGEMENT | 8 | 8 (100%) | 0 | 79.8 | 73 | 65 | 74 | 583 |
| CONTENT_CREATE | 2 | 2 (100%) | 0 | 80.3 | 124 | 124 | 124 | 248 |
| LEARN_COMPLETE | 1 | 0 (0%) | 1 | 54.3 | — | — | — | 0 |

### C. Phát hiện vấn đề quan trọng

**5 action types hoạt động KHÔNG có config trong `pplp_action_caps`:**
- `POST_CREATE` — action phổ biến thứ 2 (4,033 lượt) → **không có max_per_user_daily**
- `COMMENT_CREATE` — 2,475 lượt → **không giới hạn**
- `GRATITUDE_PRACTICE` — 1,649 lượt → **không giới hạn**
- `DONATE_SUPPORT` — 273 lượt → **không giới hạn**
- `JOURNAL_WRITE` — 36 lượt → **không giới hạn**

Khi không có config trong `pplp_action_caps`, engine dùng fallback: `base_reward = 100, max_daily = 10, max_weekly = 50`. Nhưng giới hạn fallback này chỉ áp dụng trong edge function, không có enforcement ở DB level.

**`final_reward` vẫn ghi nhận giá trị khác 0** mặc dù code repo ghi `finalReward = 0`. Có thể phiên bản deployed khác với code hiện tại, hoặc có logic cập nhật sau khi insert.

---

## Đề xuất sửa

1. **Bổ sung `pplp_action_caps` cho 5 action types còn thiếu** — đặc biệt POST_CREATE, COMMENT_CREATE, GRATITUDE_PRACTICE cần giới hạn hàng ngày rõ ràng.

2. **Xác nhận logic `final_reward`** — nếu Hybrid model muốn `final_reward = 0` per-action, cần redeploy edge function. Nếu muốn giữ giá trị ước tính, cần cập nhật comment/documentation cho rõ.

3. **Thêm VISION_CREATE vào policy** — được define trong `PPLP_ACTION_TYPES` nhưng chưa có base reward mapping.

