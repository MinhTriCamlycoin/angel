
# KE HOACH TRIEN KHAI SSO BRIDGE (PHIA ANGEL AI)

Cha Lovable Angel AI da doc ky ke hoach cua Cha Lovable FUN Profile. Ke hoach rat ro rang va day du. Duoi day la ke hoach trien khai cu the phia Angel AI.

---

## I. HIEN TRANG ANGEL AI

- Bang `fun_id_links` da ton tai (angel_user_id, fun_profile_user_id, status, metadata)
- Edge Function `fun-profile-bridge` da ton tai nhung chi doc data 1 chieu
- **Chua co secrets**: `FUN_PROFILE_API_URL`, `BRIDGE_SHARED_SECRET` hay bat ky secret lien quan SSO
- Chua co route `/auth/callback`
- Chua co SDK `@fun-ecosystem/sso-sdk`

---

## II. NHUNG GI CAN LAM (5 BUOC)

### Buoc 1: Thiet lap Secrets

Them 1 secret vao Edge Functions:
- `FUN_PROFILE_API_URL` = `https://bhtsnervqiwchluwuxki.supabase.co/functions/v1`

(Khong can `FUN_SSO_CLIENT_ID` vi hardcode `angel_ai_client` trong code client-side, khong phai secret)

### Buoc 2: Cai SDK + Tao `src/lib/funProfile.ts`

```typescript
import { FunProfileClient, SessionStorageAdapter } from '@fun-ecosystem/sso-sdk';

export const funProfile = new FunProfileClient({
  clientId: 'angel_ai_client',
  redirectUri: window.location.origin + '/auth/callback',
  scopes: ['profile', 'email', 'wallet', 'soul', 'rewards', 'platform_data'],
  storage: new SessionStorageAdapter('angel_ai_client'),
});
```

### Buoc 3: Tao route `/auth/callback` + Page component

Tao file `src/pages/AuthCallback.tsx`:
- Nhan `code` + `state` tu URL params
- Goi `funProfile.handleCallback(code, state)` de exchange code -> tokens
- Goi Edge Function `bridge-login` voi `fun_access_token`
- Nhan Supabase session tokens tu bridge-login
- Set session cho Angel Supabase client bang `supabase.auth.setSession()`
- Redirect ve `/` (hoac returnUrl)
- Hien thi loading spinner trong luc xu ly

Them route vao `App.tsx`:
```
<Route path="/auth/callback" element={<AuthCallback />} />
```

### Buoc 4: Tao Edge Function `bridge-login`

File: `supabase/functions/bridge-login/index.ts`

Logic:
1. Nhan `{ fun_access_token }` tu client POST request
2. Goi `FUN_PROFILE_API_URL/sso-verify` voi `Authorization: Bearer <fun_access_token>` de xac thuc
3. Nhan identity: `{ sub, fun_id, username, email, avatar_url, wallet_address, scopes }`
4. Dung Supabase Admin client:
   - Tim user theo email: `auth.admin.listUsers()` filter by email
   - Neu chua co: `auth.admin.createUser({ email, email_confirm: true })`
   - Upsert `fun_id_links` (angel_user_id <-> fun_user_id, status: 'active')
   - Upsert `profiles` (cap nhat avatar, display_name tu FUN Profile neu co)
5. Tao session: `auth.admin.generateLink({ type: 'magiclink', email })` hoac tuong duong
6. Tra ve `{ session: { access_token, refresh_token }, user_id }`

Config trong `supabase/config.toml`:
```toml
[functions.bridge-login]
verify_jwt = false
```

### Buoc 5: Them nut "Dang nhap tu FUN Profile" tren Auth page

Them 1 button tren `src/pages/Auth.tsx`:
- Icon FUN Profile + text "Dang nhap bang FUN Profile"
- onClick: goi `funProfile.startAuth()` -> redirect user sang fun.rich SSO
- Dat duoi form login hien tai, tren footer text

---

## III. NOI DUNG GỬI CHO CHA LOVABLE FUN PROFILE

Cha Lovable Angel AI xac nhan:

1. **Client ID**: `angel_ai_client` - OK
2. **Redirect URIs**: Ca 2 URL deu dung:
   - `https://angel.fun.rich/auth/callback`
   - `https://angel999.lovable.app/auth/callback`
3. **Scopes**: Dung het 6 scopes: `profile, email, wallet, soul, rewards, platform_data`
4. **PKCE S256**: OK, SDK xu ly

**Yeu cau Cha Lovable FUN Profile thuc hien INSERT vao `oauth_clients` truoc khi Angel AI bat dau test.**

---

## IV. THU TU TRIEN KHAI

| # | Viec | Chi tiet |
|---|---|---|
| 1 | Them secret `FUN_PROFILE_API_URL` | Yeu cau user nhap gia tri |
| 2 | Cai `@fun-ecosystem/sso-sdk` + tao `src/lib/funProfile.ts` | Client-side SDK init |
| 3 | Tao `src/pages/AuthCallback.tsx` + them route | Xu ly OAuth callback |
| 4 | Tao `supabase/functions/bridge-login/index.ts` + config | Server-side verify + session |
| 5 | Them nut SSO tren Auth page | UI button |

---

## V. LUU Y KY THUAT

- `bridge-login` dung `SUPABASE_SERVICE_ROLE_KEY` (da co san trong Edge Function env) de goi Admin API
- Khong can tao bang moi (da co `fun_id_links` va `profiles`)
- SDK la client-side, Edge Function chi nhan `fun_access_token` de verify server-to-server
- Session duoc set bang `supabase.auth.setSession()` tren client sau khi nhan tokens tu bridge-login
- Nut SSO chi hien khi user chua login
