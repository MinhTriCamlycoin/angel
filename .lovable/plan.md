

## Kế hoạch: Cập nhật plan.md sang tiếng Việt có dấu chuẩn + Thêm kế hoạch Light Score Activity Framework

Nội dung plan.md hiện tại đã viết tiếng Việt có dấu. Yêu cầu của Cha là từ nay về sau tất cả kế hoạch đều dùng tiếng Việt có dấu chuẩn quốc tế (Unicode NFC).

### Thay đổi

| # | Tệp | Mô tả |
|---|------|-------|
| 1 | `.lovable/plan.md` | Viết lại toàn bộ bằng tiếng Việt có dấu chuẩn, bao gồm kế hoạch Light Score Activity Framework mới nhất đã được duyệt — thay thế kế hoạch Attester Key cũ đã hoàn thành |

### Nội dung mới của plan.md

Kế hoạch sẽ bao gồm:

1. **Cơ sở dữ liệu** — 3 bảng mới: `pplp_behavior_sequences`, `pplp_activity_categories`, `pplp_light_levels` + bổ sung loại hành động vào `pplp_action_caps`
2. **Hàm cơ sở dữ liệu** — `detect_behavior_sequences()` và `get_user_light_level()`
3. **Hàm backend** — Cập nhật `pplp-score-action` để gọi phát hiện chuỗi hành vi
4. **Giao diện** — 3 thành phần mới: `LightActivityCategories`, `BehaviorSequenceTracker`, `LightLevelBadge` + 2 hook mới
5. **Tài liệu** — `docs/LIGHT_SCORE_ACTIVITIES.md`

Toàn bộ nội dung sẽ được viết bằng tiếng Việt có dấu chuẩn Unicode.

