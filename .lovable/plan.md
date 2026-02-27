

## Kế hoạch: Light Score Mathematical Spec (LS-Math v1.0)

### Hiện trạng
- `scoring_rules` V1.0 đã có nhưng **thiếu tham số toán học** (α, β, λ, γ, η, κ, θ, π_max, ω_B, ω_C, cap)
- `compute_light_score_ledger` RPC hiện dùng công thức đơn giản (`AVG(light_score) × multipliers`) — **chưa đúng spec**
- `pplp-score-action` tính pillar scores từ metadata heuristic — **chưa tích hợp community ratings** (P_c từ weighted rater scores)
- `build_features_user_day` chỉ đếm actions — **chưa tính B_u(t), C_u(t)** theo công thức
- Anti-whale cap đã có trong `process-mint-cycle` nhưng **chưa có eligibility gate** (§13)
- Fallback cold-start (§10) **chưa có**

---

### Bước 1: Database — Cập nhật `scoring_rules` V1.0 với tham số toán học đầy đủ

Update `formula_json` của V1.0 để chứa tất cả 17 tham số mặc định:
```json
{
  "w_min": 0.5, "w_max": 2.0, "alpha": 0.25,
  "gamma": 1.3,
  "beta": 0.6, "lambda": 30,
  "eta": 0.5, "kappa": 5,
  "pi_max": 0.5, "theta": 0.8,
  "omega_B": 0.4, "omega_C": 0.6,
  "cap": 0.03,
  "min_ratings": 3,
  "L_min": 10,
  "r_threshold": 0.7
}
```

### Bước 2: Database Migration — RPC `compute_daily_light_score`

Tạo RPC mới thực hiện đúng công thức toán học:

| Hàm | Mô tả |
|-----|-------|
| `compute_reputation_weight_v2(_user_id, _params)` | w_u = clip(w_min, w_max, 1 + α·log(1+R_u)) |
| `compute_content_pillar_score(_content_id)` | P_c,k = Σ(w_r · s_r,c,k) / (Σw_r + ε) với fallback cold-start |
| `compute_daily_light_score(_user_id, _date, _params)` | L_u(t) = (ω_B·B + ω_C·C) × M^cons × M^seq × Π |
| `compute_epoch_light_score(_user_id, _epoch_start, _epoch_end)` | L_u(e) = Σ L_u(t) |
| `check_mint_eligibility(_user_id, _epoch)` | 4 điều kiện: PPLP accepted, integrity gate, L_min, no cluster review |

Chi tiết từng hàm:
- **B_u(t)**: Σ b_τ · g(x_i) — dùng `pplp_action_caps.base_reward` làm b_τ, g(x) từ payload features
- **C_u(t)**: Σ ρ(type) · h(P_c) — với h(P_c) = (P_c/10)^γ
- **M^cons**: 1 + β·(1 - e^(-S/λ)) — S = streak từ `features_user_day`
- **M^seq**: 1 + η·tanh(Q/κ) — Q = Σ δ_q từ completed sequences
- **Π**: 1 - min(π_max, θ·r_u) — r_u từ `pplp_fraud_signals`

### Bước 3: Cập nhật `pplp-score-action` — Tích hợp community ratings

| # | Thay đổi |
|---|----------|
| 1 | Khi có `pplp_ratings` cho content → tính P_c,k weighted theo reputation |
| 2 | Cold-start fallback: nếu < N_min ratings → dùng μ_topic · φ_u |
| 3 | Load tham số từ `scoring_rules` active thay vì hardcode |
| 4 | Tính L_u(t) theo công thức mới và lưu vào `features_user_day` |

### Bước 4: Cập nhật `process-mint-cycle` — Eligibility Gate

| # | Thay đổi |
|---|----------|
| 1 | Trước khi allocate, kiểm tra `check_mint_eligibility` cho mỗi user |
| 2 | Anti-whale: iterative redistribution (lặp đến hết dư) |
| 3 | Lưu eligibility flags vào `pplp_mint_allocations` |

### Bước 5: Cập nhật `compute_light_score_ledger` — Dùng công thức epoch

| # | Thay đổi |
|---|----------|
| 1 | Thay `AVG(light_score)` bằng `Σ L_u(t)` từ `features_user_day` |
| 2 | Level mapping theo ngưỡng configurable từ `scoring_rules` |
| 3 | Ghi `rule_version`, `reason_codes`, `trend` |

### Bước 6: Frontend — Hiển thị Math Spec trên ScoreExplanationPanel

| # | Thay đổi |
|---|----------|
| 1 | Hiển thị breakdown: B_u, C_u, M^cons, M^seq, Π |
| 2 | Hiển thị eligibility status cho mint |

### Bước 7: Tài liệu — Cập nhật docs

| # | Tệp |
|---|-----|
| 1 | Tạo `docs/LIGHT_SCORE_MATH_SPEC.md` với toàn bộ spec v1.0 |

---

### Chi tiết kỹ thuật

**Reputation Weight (§3):**
```text
w_u = clip(0.5, 2.0, 1 + 0.25 · log(1 + R_u))
R_u = f(contribution_days, pass_rate, completion_streaks, trust_score)
```

**Content Pillar Score (§4):**
```text
P_c,k = Σ(w_r · s_r,c,k) / (Σw_r + ε)
P_c = Σ P_c,k  (range 0→10)
Fallback: P̃_c = μ_topic · φ_u  (khi ratings < N_min)
```

**Daily Light Score (§11):**
```text
L_raw = 0.4·B_u(t) + 0.6·C_u(t)
L_u(t) = L_raw × M^cons × M^seq × Π
```

**Eligibility (§13):**
```text
I_u(e) = 1 iff:
  1. PPLP accepted
  2. avg_risk ≤ 0.7
  3. L_u(e) ≥ L_min
  4. No cluster review confirmed
```

