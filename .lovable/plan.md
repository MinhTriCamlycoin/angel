
# Fix: Nut "Dang nhap bang FUN Profile" khong hoat dong

## Nguyen nhan

SDK method `startAuth()` tra ve `Promise<string>` (authorization URL) -- NO tu dong redirect. Code hien tai goi `funProfile.startAuth()` nhung khong dung returned URL de redirect browser.

## Giai phap

Sua file `src/pages/Auth.tsx` (dong 795-797):

Thay:
```typescript
const { funProfile } = await import("@/lib/funProfile");
funProfile.startAuth();
```

Thanh:
```typescript
const { funProfile } = await import("@/lib/funProfile");
const authUrl = await funProfile.startAuth();
window.location.href = authUrl;
```

## Chi tiet ky thuat

- `startAuth()` internally generates PKCE `code_verifier` + `code_challenge`, saves state to SessionStorage, then returns the full OAuth authorization URL
- Chuyen huong bang `window.location.href` de redirect user sang FUN Profile SSO (`fun.rich/functions/v1/sso-authorize?client_id=angel_ai_client&...`)
- Chi 1 file can sua, 1 dong code them

## Anh huong

- Khong anh huong den cac tinh nang khac
- AuthCallback page (`/auth/callback`) khong can thay doi -- da xu ly dung `handleCallback(code, state)`
