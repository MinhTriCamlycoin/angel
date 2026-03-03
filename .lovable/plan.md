# Di chuyển FUN ID lên đầu trang Auth + Hologram style

## Hiện trạng

- Nút "Đăng ký FUN ID / Đăng nhập bằng FUN ID" nằm ở **cuối cùng** trang Auth (dòng 788-817), sau form email/password và Google.
- Style hiện tại: `variant="outline"`, không nổi bật.

## Thay đổi

### 1. Thêm FUN Ecosystem logo vào `src/assets`

Copy ảnh FUN_Ecosystem.png user upload vào `src/assets/fun-ecosystem-logo.png`.

### 2. Tạo section FUN ID nổi bật ở đầu CardContent (trước form)

- Đặt ngay sau `</CardHeader>`, trước form email/password.
- Bao gồm:
  - Logo FUN Ecosystem (ảnh đã upload)
  - Nút chính "Đăng ký FUN ID" / "Đăng nhập bằng FUN ID" với style hologram nổi bật
  - Mô tả ngắn gọn ưu điểm FUN ID: "Một tài khoản duy nhất cho toàn bộ nền tảng của FUN Ecosystem. Miễn phí, bảo mật, đồng bộ mọi nơi."

### 3. Hologram CSS style

Thêm vào `src/index.css` class `.btn-fun-id-hologram`:

- Gradient nền chuyển từ tím → xanh → cam (giống logo infinity)
- Animation shimmer/hologram liên tục
- Border glow effect
- Text trắng, bold

### 4. Cấu trúc layout mới trong Auth.tsx

```text
CardHeader (logo Angel AI, tiêu đề)
CardContent:
  ┌─────────────────────────────────┐
  │  🌈 FUN ID Section (MỚI)       │
  │  Logo FUN Ecosystem             │
  │  [Đăng ký/Đăng nhập FUN ID]    │  ← hologram button
  │  "1 ID cho 12 nền tảng FUN..." │
  └─────────────────────────────────┘
  ── hoặc tiếp tục với ──
  Form email/password
  Nút submit
  ── hoặc ──
  Google sign in
  Toggle đăng ký/đăng nhập
```

### 5. Xóa section FUN ID cũ ở cuối trang (dòng 788-817)

## Files thay đổi

1. `src/assets/fun-ecosystem-logo.png` — copy từ upload
2. `src/index.css` — thêm `.btn-fun-id-hologram` animation
3. `src/pages/Auth.tsx` — di chuyển FUN ID lên đầu, thêm logo + mô tả + hologram style