

# Fix: "Missing email in FUN identity payload"

## Nguyen nhan goc

Log backend cho thay ro: endpoint `sso-verify` cua FUN Profile tra ve **KHONG CO truong `email`** o bat ky cap nao. Cac key tra ve:

```text
sub, fun_id, username, custodial_wallet, active, token_type, full_name,
avatar_url, bio, created_at, wallet_address, external_wallet_address,
custodial_wallet_address, soul_nft, rewards, platform_data, token_info
```

FUN Profile team da them `email` vao response cua `sso-token` nhung **CHUA them vao `sso-verify`**. Hien tai flow la:
1. Client SDK goi `sso-token` (co email) → nhan `accessToken`
2. Client gui `accessToken` den `bridge-login`
3. `bridge-login` goi `sso-verify` (KHONG co email) → loi

## Giai phap (2 buoc)

### 1. AuthCallback gui them email tu SDK response

SDK `handleCallback()` tra ve object co the chua thong tin user (tu `sso-token` response). Sua `AuthCallback.tsx` de gui kem `email` (neu co) tu SDK result sang `bridge-login`:

```typescript
// AuthCallback.tsx
const result = await funProfile.handleCallback(code, state);
const res = await fetch(bridgeUrl, {
  method: "POST",
  body: JSON.stringify({ 
    fun_access_token: result.accessToken,
    hint_email: result.email || result.user?.email || null,
  }),
});
```

### 2. Bridge-login them 3 fallback de tim email

Sua `bridge-login/index.ts` normalizeIdentity them:
- `r.token_info?.email` — field `token_info` co trong response
- Decode JWT access_token de lay `email` claim (khong can secret vi chi doc payload)
- Nhan `hint_email` tu client lam fallback cuoi cung (sau khi da verify token hop le)

```typescript
// Them vao normalizeIdentity
const email =
  r.email ||
  r.user?.email ||
  r.profile?.email ||
  r.data?.email ||
  r.token_info?.email ||
  null;

// Trong main handler, sau khi sso-verify thanh cong:
if (!normalized.email) {
  // Try decode JWT payload
  try {
    const parts = fun_access_token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.email) normalized.email = payload.email;
    }
  } catch {}
}

// Final fallback: trust hint_email since token was verified
if (!normalized.email && hint_email) {
  normalized.email = hint_email;
}
```

## Files thay doi

1. `src/pages/AuthCallback.tsx` — gui them `hint_email`
2. `supabase/functions/bridge-login/index.ts` — them JWT decode + token_info + hint_email fallback

## Bao mat

- `hint_email` chi duoc dung SAU KHI `sso-verify` xac nhan token hop le
- JWT decode chi doc payload (khong verify signature) nhung token da duoc verify boi `sso-verify`
- Khong thay doi kien truc xac thuc

