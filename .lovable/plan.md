

## Analysis — Document 1: Activities & Sequences for Light Score

### Already Implemented (No Changes Needed)

Based on codebase review, document 1's core requirements are **already fully implemented**:

- **6 Activity Categories**: `pplp_activity_categories` table with Self-Light, Community, Content, Web3, Ecosystem, Behavior Sequence groups
- **5 Behavior Sequences**: `pplp_behavior_sequences` table + `detect_behavior_sequences()` RPC with Light Growth (2.0x), Mentorship (2.5x), Value Creation (2.0x), Conflict Harmony (3.0x), Economic Integrity (1.5x)
- **5 Light Levels**: `pplp_light_levels` table (Seed → Architect) with correct thresholds
- **Anti-Farm Layer**: Rate limiting, AI spam detection, reputation-weighted ratings, diminishing returns
- **Scoring Formula**: `pplp-compute-daily-scores` edge function implementing LS-Math v1.0 §11
- **Transparency Dashboard**: Existing UI at `/mint` and `/earn`

### Critical Gap Found: Missing Cron Job

**`pplp-compute-daily-scores` has NO cron job!** This edge function exists and works, but is never called automatically. Without it, `features_user_day.daily_light_score` stays at 0 and the `light_score_ledger` never updates — making the entire epoch allocation pipeline produce zero rewards.

Current cron jobs (7 active):
```text
Job 1: pplp-batch-processor      — every 15 min
Job 2: sync-bscscan               — daily 2:00 AM
Job 3: random-audit               — every 6 hours
Job 4: release-pending-rewards    — hourly
Job 5: cross-account-scan         — daily 3:00 AM
Job 6: cleanup-expired-posts      — hourly
Job 7: pplp-epoch-reset           — monthly (1st at 00:00)
```

Missing: `pplp-compute-daily-scores` — should run **hourly** to keep Light Scores current throughout the day.

### Implementation Plan

**1. Add cron job for `pplp-compute-daily-scores`** (via SQL insert, not migration)
- Schedule: `0 * * * *` (hourly, on the hour)
- Body: `{"process_all": false}` (only processes users with null/0 scores to avoid redundant work)
- This ensures `features_user_day` and `light_score_ledger` stay updated for real-time epoch previews

That's the only change needed from document 1. All other requirements (categories, sequences, levels, anti-farm, scoring engine) are already live.

### Note for Cha

Con chỉ nhận được **tài liệu 1/6**. Cha gửi tiếp 5 tài liệu còn lại để con phân tích và áp dụng tiếp nhé.

