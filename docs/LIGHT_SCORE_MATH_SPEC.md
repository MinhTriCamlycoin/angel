# LIGHT SCORE MATHEMATICAL SPEC (PPLP) — FUN PROFILE

**Version:** LS-Math v1.0  
**Scope:** Tính Light Score cá nhân theo ngày/tuần/tháng + điều kiện mint FUN Money theo epoch  
**Core rule:** PPLP thưởng cho Ánh Sáng thật, không thưởng cho ồn ào.

---

## 1. Định nghĩa tập hợp & ký hiệu

- **Người dùng:** u ∈ U
- **Nội dung:** c ∈ C
- **Thời gian rời rạc theo ngày:** t ∈ T (UTC)
- **Epoch mint (chu kỳ):** e ∈ E (tuần/tháng)

### 5 Cột Trụ (Pillars)

| k | Pillar |
|---|--------|
| 1 | Truth & Transparency (T) |
| 2 | Sustainable Contribution (S) |
| 3 | Healing & Love (H) |
| 4 | Service to Life (C) |
| 5 | Unity with Source (U) |

---

## 2. Dữ liệu đầu vào

### 2.1 Event stream
Mỗi event i: actor a(i)=u, time t(i), type τ(i), payload features **x**_i

### 2.2 Community ratings
Mỗi rating của rater r cho content c: s_{r,c,k} ∈ {0,1,2} cho mỗi cột trụ k

---

## 3. Trọng số uy tín (Reputation Weight)

```
w_u(t) = clip(w_min, w_max, 1 + α · log(1 + R_u(t)))
```

- w_min = 0.5, w_max = 2.0, α = 0.25
- R_u = contribution_days × pass_rate × (1 + streak_bonus)

**RPC:** `compute_reputation_weight_v2(_user_id, _w_min, _w_max, _alpha)`

---

## 4. Điểm nội dung theo 5 cột trụ (Content Pillar Score)

```
P_{c,k} = Σ(w_r · s_{r,c,k}) / (Σw_r + ε)
P_c = Σ P_{c,k}  (range 0→10)
```

**Cold-start fallback (§10):** Khi ratings < N_min:
```
P̃_c = μ_topic · φ_u
```
- μ_topic: điểm trung bình theo chủ đề cộng đồng (30 ngày gần nhất)
- φ_u: hệ số tin cậy theo lịch sử user (0.8–1.1)

**RPC:** `compute_content_pillar_score(_content_id, _min_ratings, _gamma)`

---

## 5. Điểm hành động (Action Base Score)

```
B_u(t) = Σ b_τ(i) · g(x_i)
```
- b_τ: base_reward từ `pplp_action_caps`
- g(x_i) ∈ [0, 1.5]: quality_score từ payload

---

## 6. Điểm nội dung theo ngày

```
C_u(t) = Σ ρ(type(c)) · h(P_c)
h(P_c) = (P_c / 10)^γ    (γ = 1.3)
```

| Content Type | ρ |
|---|---|
| ANALYSIS_POST | 1.5 |
| POST_CREATE | 1.0 |
| SHARE_CONTENT | 0.5 |
| COMMENT_CREATE | 0.3 |

---

## 7. Consistency Multiplier

```
M^cons_u(t) = 1 + β · (1 - e^(-S/λ))
```
- β = 0.6, λ = 30
- S = consistency_streak từ features_user_day

---

## 8. Sequence Multiplier

```
M^seq_u(t) = 1 + η · tanh(Q/κ)
```
- η = 0.5, κ = 5
- Q = Σ δ_q từ completed sequences

---

## 9. Integrity Penalty

```
Π_u(t) = 1 - min(π_max, θ · r_u(t))
```
- π_max = 0.5, θ = 0.8
- r_u = avg(severity/5) từ pplp_fraud_signals unresolved

---

## 11. Light Score theo ngày

```
L^raw_u(t) = ω_B · B_u(t) + ω_C · C_u(t)
L_u(t) = L^raw · M^cons · M^seq · Π
```
- ω_B = 0.4, ω_C = 0.6

**RPC:** `compute_daily_light_score(_user_id, _date)`

---

## 12. Light Score theo epoch

```
L_u(e) = Σ L_u(t)  for t ∈ e
```

**RPC:** `compute_epoch_light_score(_user_id, _epoch_start, _epoch_end)`

---

## 13. Điều kiện đủ để nhận mint (Eligibility)

```
I_u(e) = 1 iff:
  1. PPLP accepted
  2. avg_risk ≤ r_threshold (0.7)
  3. L_u(e) ≥ L_min (10)
  4. No unresolved cluster review
```

**RPC:** `check_mint_eligibility(_user_id, _epoch_start, _epoch_end)`

---

## 14. Mint allocation theo epoch

```
A_u(e) = I_u(e) · M(e) · L_u(e) / (T(e) + ε)
```

Anti-whale cap: `A_u(e) ≤ cap · M(e)` (cap = 3%)  
Excess redistributed iteratively until convergence.

---

## 15. Level mapping

| Level | Threshold |
|---|---|
| Seed | L < 10 |
| Sprout | 10 ≤ L < 30 |
| Builder | 30 ≤ L < 60 |
| Guardian | 60 ≤ L < 100 |
| Architect | L ≥ 100 |

---

## 16. Explainability

Mỗi L_u(e) sinh object giải thích:
- Top 5 contributors (action_type, light_score, reward)
- Reason codes: CONSISTENCY_STRONG, VALUE_LOOP_ACTIVE, HIGH_REPUTATION, TEMPORARY_WEIGHT_ADJUSTMENT
- Trend: stable / growing / reflecting

---

## 17. Tham số mặc định (v1.0)

| Param | Value | Description |
|---|---|---|
| w_min | 0.5 | Min reputation weight |
| w_max | 2.0 | Max reputation weight |
| α | 0.25 | Reputation scaling |
| γ | 1.3 | Content quality exponent |
| β | 0.6 | Max consistency bonus (+60%) |
| λ | 30 | Consistency saturation (days) |
| η | 0.5 | Sequence bonus scale |
| κ | 5 | Sequence saturation |
| π_max | 0.5 | Max integrity penalty (50%) |
| θ | 0.8 | Penalty scaling |
| ω_B | 0.4 | Action weight |
| ω_C | 0.6 | Content weight |
| cap | 0.03 | Anti-whale cap (3%) |
| min_ratings | 3 | Min ratings for P_c |
| L_min | 10 | Min epoch score for mint |
| r_threshold | 0.7 | Max avg risk for eligibility |

---

## 19. A.I. Support (không quyết định tiền)

AI chỉ xuất:
- `ego_risk(c) ∈ [0,1]`
- `pillar_suggest_{c,k} ∈ {0,1,2}`
- `spam_risk(u,t) ∈ [0,1]`

AI không trực tiếp thay P_c nếu chưa có rating cộng đồng.
