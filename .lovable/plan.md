
## Kế hoạch: Light Score Activity Framework & Behavior Sequence Engine

Triển khai hệ thống phân loại hoạt động 6 nhóm và Chuỗi Hành Vi (Behavior Sequence Engine) để tính điểm Light Score theo tinh thần PPLP (Proof of Pure Love Protocol).

---

### Bước 1: Cơ sở dữ liệu (Migration)

| # | Đối tượng | Mô tả |
|---|-----------|-------|
| 1 | Bảng `pplp_behavior_sequences` | Theo dõi chuỗi hành vi của người dùng: `user_id`, `sequence_type`, `actions` (uuid[]), `stage`, `max_stage`, `sequence_multiplier`, `status` (active/completed/expired), `started_at`, `completed_at`, `expires_at` |
| 2 | Bảng `pplp_activity_categories` | Ánh xạ loại hành động → 6 nhóm: self_light, community_interaction, content_value, web3_economic, ecosystem_contribution, behavior_sequence. Gồm `base_weight`, `description_vi`, `description_en` |
| 3 | Bảng `pplp_light_levels` | 5 tầng Light Score: Light Presence, Light Contributor, Light Builder, Light Guardian, Light Architect. Gồm `level`, `name_vi`, `name_en`, `min_score`, `max_score`, `icon`, `perks` (jsonb) |
| 4 | Bổ sung `pplp_action_caps` | Thêm các loại hành động mới: PROFILE_COMPLETE, KYC_VERIFY, VISION_CREATE, SHARE_CONTENT, CONFLICT_RESOLVE, REPORT_VALID, CAMPAIGN_SUPPORT, ECO_ACTION, REFERRAL_INVITE, GOV_VOTE, POLICY_REVIEW, CARBON_OFFSET |

### Bước 2: Hàm cơ sở dữ liệu

| # | Hàm | Mô tả |
|---|-----|-------|
| 1 | `detect_behavior_sequences(user_id)` | Quét `pplp_actions` gần đây để phát hiện và cập nhật chuỗi hành vi phù hợp |
| 2 | `get_user_light_level(user_id)` | Trả về cấp độ Light Level (1–5) dựa trên Light Score trung bình + số chuỗi đã hoàn thành |

### Bước 3: Cập nhật hàm backend

| # | Hàm | Mô tả |
|---|-----|-------|
| 1 | `pplp-score-action` | Sau khi chấm điểm, gọi `detect_behavior_sequences()` để kiểm tra chuỗi. Nếu hoàn thành chuỗi, áp dụng `sequence_multiplier` (1.5x–3.0x) làm thưởng bổ sung |

### Bước 4: Giao diện (Frontend)

| # | Thành phần | Mô tả |
|---|------------|-------|
| 1 | `LightActivityCategories` | Hiển thị 6 nhóm hoạt động với chỉ báo tiến trình từng nhóm |
| 2 | `BehaviorSequenceTracker` | Hiển thị chuỗi hành vi đang hoạt động/đã hoàn thành dạng pipeline |
| 3 | `LightLevelBadge` | Hiển thị cấp độ Light Level hiện tại (1–5) với tên tầng và biểu tượng |
| 4 | Hook `useBehaviorSequences` | Lấy dữ liệu chuỗi hành vi từ `pplp_behavior_sequences` |
| 5 | Hook `useLightLevel` | Lấy cấp độ Light Level qua hàm RPC `get_user_light_level` |
| 6 | Cập nhật `Earn.tsx` | Thêm các thành phần mới vào trang Kiếm điểm |

### Bước 5: Tài liệu

| # | Tệp | Mô tả |
|---|-----|-------|
| 1 | `docs/LIGHT_SCORE_ACTIVITIES.md` | Tài liệu đầy đủ về phân loại hoạt động, định nghĩa chuỗi hành vi, và các tầng Light Level |

---

### Định nghĩa 5 chuỗi hành vi

```
LIGHT_GROWTH:       Đăng bài → Cộng đồng tương tác (≥3) → Phản hồi xây dựng → Tạo nội dung nâng cao → Hệ số 2.0x
MENTORSHIP:         Hướng dẫn thành viên mới → Hoàn thiện hồ sơ → Tạo nội dung đầu tiên → Hệ số 2.5x
VALUE_CREATION:     Hoàn thành khóa học → Tạo nội dung → Tương tác (≥5) → Chia sẻ → Hệ số 2.0x
CONFLICT_HARMONY:   Giải quyết tranh luận → Phản hồi bình tĩnh → Cộng đồng xác nhận → Hệ số 3.0x
ECONOMIC_INTEGRITY: Hỏi đáp (≥5) → Quyên góp → Chia sẻ → Hệ số 1.5x
```

### Quy tắc chống farm điểm

- Chuỗi phải hoàn thành trong 7 ngày
- Mỗi loại chuỗi tối đa 1 lần/tuần/người dùng
- Giảm dần thưởng khi lặp lại chuỗi giống nhau
- Kiểm tra cảm xúc AI cho tín hiệu chất lượng nội dung

### 5 tầng Light Level

| Tầng | Tên tiếng Việt | Tên tiếng Anh | Điểm tối thiểu |
|------|----------------|---------------|-----------------|
| 1 | Hiện diện tích cực | Light Presence | 0 |
| 2 | Người tạo giá trị | Light Contributor | 200 |
| 3 | Người xây dựng | Light Builder | 500 |
| 4 | Người bảo vệ | Light Guardian | 1000 |
| 5 | Người thiết kế | Light Architect | 2000 |
