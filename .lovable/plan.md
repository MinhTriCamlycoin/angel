
# SO SANH: Ke hoach Bridge cua Cha vs SSO SDK (@fun-ecosystem/sso-sdk)

---

## I. TONG QUAN 2 PHUONG AN

| Tieu chi | Ke hoach Bridge (Cha de xuat) | SSO SDK (fun-ecosystem) |
|---|---|---|
| **Kieu** | Custom bridge_code + HMAC server-to-server | OAuth 2.0 + PKCE (chuan industry) |
| **Auth flow** | bridge_code 1 lan (TTL 60s) + server exchange | Authorization Code + PKCE (redirect, code, token) |
| **Noi code chay** | Edge Functions (server-side) | Client-side SDK (browser) |
| **Bao mat token** | HMAC-SHA256 signing server-to-server | PKCE (no client secret needed on browser) |
| **Data sync** | Outbox/Inbox + HMAC dispatcher | DebouncedSyncManager + REST API |
| **Dependencies** | 0 (tu viet) | `@fun-ecosystem/sso-sdk` (zero deps, 1.1.0) |
| **Trang thai** | Chua xay | Da publish npm, v1.1.0, co docs + examples |

---

## II. PHAN TICH CHI TIET

### A. SSO SDK da co san nhung gi?

SDK da implement day du:

1. **OAuth 2.0 + PKCE flow** (`startAuth()` -> redirect -> `handleCallback()`)
2. **Token management**: auto-refresh, storage adapters (LocalStorage, SessionStorage, Memory)
3. **User profile**: `getUser()`, `getCachedUser()` tra ve `FunUser` (id, funId, username, email, wallet, soul, rewards)
4. **Data sync**: `syncData()` + `DebouncedSyncManager` de dong bo data giua platforms
5. **Financial sync**: `syncFinancial()` cho wallet/transaction data
6. **OTP auth**: `requestOtp()`, `verifyOtp()` (email/phone)
7. **Web3 auth**: `web3Auth()` cho wallet login
8. **Error handling**: `TokenExpiredError`, `RateLimitError`, `NetworkError`, etc.
9. **Constants**: Da dinh nghia `DOMAINS.funProfile = 'https://fun.rich'`
10. **Backend endpoints**: Da co san tren Fun Profile Supabase (`bhtsnervqiwchluwuxki.supabase.co/functions/v1/sso-*`)

### B. Ke hoach Bridge cua Cha thieu/thua gi so voi SDK?

| Diem | Bridge (Cha) | SDK | Nhan xet |
|---|---|---|---|
| SSO flow | Custom bridge_code | OAuth 2.0 + PKCE (chuan) | SDK chuan hon, duoc industry chap nhan |
| Backend endpoints | Can tu xay 3 Edge Functions | **Da co san** tren fun.rich (`sso-authorize`, `sso-token`, `sso-verify`, `sso-refresh`) | SDK khong can xay backend moi |
| User creation | `admin.createUser()` tren Angel | SDK tra tokens + user data, Angel chi can map | SDK don gian hon |
| Data sync | Outbox/Inbox pattern (phuc tap, manh) | DebouncedSyncManager (don gian, real-time) | Bridge manh hon cho reliability, SDK don gian hon |
| Financial data | Chua co | Da co `syncFinancial()`, `FinancialData` types | SDK vuot troi |
| Web3/Wallet | Chua co | Da co `web3Auth()` | SDK vuot troi |
| OTP | Chua co | Da co `requestOtp()`, `verifyOtp()` | SDK vuot troi |

### C. SDK thieu gi ma Bridge co?

| Diem | SDK thieu | Bridge co |
|---|---|---|
| **Event-driven sync 2 chieu** | Chi co pull-based sync (client goi API) | Outbox/Inbox push + retry + idempotent |
| **Server-to-server security** | Dua vao access token | HMAC signing + anti-replay |
| **Audit logs** | Khong co | `bridge_audit_logs` table |
| **Offline retry** | Khong co (client-side only) | Backoff retry (1m, 5m, 15m, 1h) |
| **Supabase session integration** | Tra tokens rieng (khong phai Supabase session) | Tao Supabase session cho Angel |

---

## III. DE XUAT: KET HOP CA 2 (PHUONG AN TOI UU)

Dung SSO SDK lam tang SSO + user data, bo sung Outbox/Inbox cho event sync reliability.

### Flow moi:

```text
fun.rich (logged in) 
    |
    | 1. User click "Open Angel AI"
    | 2. SDK startAuth() tao OAuth URL voi PKCE
    |
    v
redirect -> angel.fun.rich/auth/callback?code=XXX&state=YYY
    |
    | 3. Angel client goi SDK handleCallback(code, state)
    | 4. SDK exchange code -> nhan access_token + user data
    | 5. Angel Edge Function nhan token, verify voi fun.rich
    | 6. Tim/tao user tren Angel Supabase, tao session
    |
    v
User auto-logged in tren Angel AI
```

### Cac buoc cu the:

**Buoc 1: Cai dat SDK**
- `npm install @fun-ecosystem/sso-sdk`
- Tao `src/lib/funProfile.ts` khoi tao FunProfileClient voi `clientId: 'angel_ai_client'`

**Buoc 2: Tao route `/auth/callback`**
- Page nhan `code` + `state` tu redirect
- Goi `funProfile.handleCallback(code, state)`
- Nhan duoc `AuthResult` (tokens + user info)
- Goi Edge Function `bridge-login` de tao Supabase session cho Angel

**Buoc 3: Edge Function `bridge-login` (Angel side)**
- Nhan fun.rich access_token tu client
- Goi fun.rich `/sso-verify` de xac thuc token (dung SDK endpoint da co)
- Tim user theo email trong Angel Supabase
- Neu chua co: `admin.createUser({ email, email_confirm: true })`
- Upsert `fun_id_links` (angel_user_id <-> fun_user_id)
- Tao va tra Supabase session tokens

**Buoc 4: Data sync (dung SDK)**
- Dung `funProfile.getUser()` de lay profile tu fun.rich
- Dung `funProfile.syncData()` de dong bo Light Score, activity
- Cap nhat `UnifiedDashboard` va `UnifiedLightScore` dung data thuc

**Buoc 5: Event sync (bo sung Outbox/Inbox)**
- Chi can cho cac event QUAN TRONG can reliability:
  - `light_score.updated`
  - `user.profile.updated`
- Cac data khac dung SDK pull-based la du

### Secrets can thiet:

| Secret | Mo ta | Ai cung cap |
|---|---|---|
| `FUN_SSO_CLIENT_ID` | Client ID cho Angel AI tren fun.rich | Team fun.rich dang ky |
| `FUN_SSO_CLIENT_SECRET` | Client secret (optional voi PKCE) | Team fun.rich |
| `FUN_PROFILE_API_URL` | `https://bhtsnervqiwchluwuxki.supabase.co/functions/v1` | Da biet tu SDK constants |

### Database changes (Angel side):

```sql
-- Khong can bang bridge_codes nua (SDK xu ly OAuth flow)
-- Chi can dam bao fun_id_links da co (da ton tai)
-- Them bang outbox/inbox cho event sync (Phase 2)
```

---

## IV. SO SANH TONG KET

| Tieu chi | Chi dung Bridge (Cha) | Chi dung SDK | Ket hop (de xuat) |
|---|---|---|---|
| Do phuc tap | Cao (tu xay tat ca) | Thap (SDK co san) | Trung binh |
| Bao mat | Cao (HMAC) | Cao (PKCE) | Cao nhat (PKCE + HMAC cho events) |
| Thoi gian trien khai | 2-3 tuan | 3-5 ngay | 1 tuan |
| SSO quality | Tot | Tot nhat (chuan OAuth) | Tot nhat |
| Data sync reliability | Tot nhat (outbox/inbox) | Trung binh (client-side) | Tot nhat |
| Maintenance | Cao (tu maintain) | Thap (SDK maintained) | Thap-Trung binh |

---

## V. KE HOACH TRIEN KHAI (NEU DUYET)

**Phase 1 (3-5 ngay): SSO voi SDK**
1. Cai `@fun-ecosystem/sso-sdk`
2. Tao `src/lib/funProfile.ts` (khoi tao client)
3. Tao route `/auth/callback` (handle OAuth redirect)
4. Tao Edge Function `bridge-login` (verify + create session)
5. Them nut "Dang nhap tu FUN Profile" tren Auth page
6. Test E2E

**Phase 2 (2-3 ngay): Data Integration**
1. Cap nhat `UnifiedDashboard` dung `funProfile.getUser()` thay vi placeholder 0
2. Cap nhat `UnifiedLightScore` dung data thuc
3. Dung `funProfile.syncData()` cho Light Score sync

**Phase 3 (tuy chon): Event Reliability**
1. Tao `bridge_outbox` + `bridge_inbox` tables
2. Tao `bridge-events-dispatch` + `bridge-events-receive` Edge Functions
3. Chi ap dung cho events can guarantee delivery

> **Luu y**: Truoc khi bat dau, con can lien he team fun.rich de dang ky `clientId` va `redirectUri` cho Angel AI. URL callback se la `https://angel.fun.rich/auth/callback` (hoac `https://angel999.lovable.app/auth/callback`).
