

# Kế hoạch: Cập nhật dữ liệu Transparency Dashboard & MintCycleStatus

## Vấn đề phát hiện

Từ screenshot (fun.rich) và dữ liệu thực tế:

1. **Transparency Dashboard hiển thị toàn bộ = 0** vì `transparency_snapshots` chỉ có 1 record với tất cả giá trị = 0. Trong khi dữ liệu thực tế:
   - Tổng Light toàn hệ: **256,467**
   - FUN đã phân bổ: **3,987,400** (315 users eligible)
   - Users hoạt động: **229**

2. **MintCycleStatus "Phân bổ gần nhất: 0 FUN"** — hook `useMintCycle` query `pplp_mint_allocations` (bảng cũ) thay vì `mint_allocations` (bảng thực tế có dữ liệu).

3. **Banner "18 Light Actions chưa gửi yêu cầu mint"** — đây là trên fun.rich (ảnh đính kèm), app Lovable đã được sửa rồi ở lần trước. Không cần thay đổi thêm ở đây.

## Giải pháp

### 1. Cập nhật `transparency_snapshots` với dữ liệu thực

Chạy SQL update record hiện có:
```sql
UPDATE transparency_snapshots 
SET total_light_system = 256467,
    total_fun_minted = 3987400,
    active_users = 229
WHERE epoch_id = 'Epoch-2026-03';
```

### 2. Sửa TransparencyDashboard fallback

Thay vì chỉ đọc từ `transparency_snapshots` (có thể stale), thêm fallback query trực tiếp từ `light_score_ledger` và `mint_allocations` khi snapshot = 0 hoặc không tồn tại. Hiển thị dữ liệu aggregate realtime.

### 3. Sửa `useMintCycle` hook — `myAllocation`

Hook hiện query `pplp_mint_allocations` nhưng dữ liệu thực nằm trong `mint_allocations`. Cần sửa để query từ `mint_allocations` (hoặc cả hai bảng rồi merge).

### 4. Tóm tắt thay đổi

| File | Thay đổi |
|------|----------|
| SQL migration | Update `transparency_snapshots` với dữ liệu thực |
| `src/components/pplp/TransparencyDashboard.tsx` | Thêm fallback aggregate khi snapshot trống/stale |
| `src/hooks/useMintCycle.ts` | Sửa `myAllocation` query từ `mint_allocations` thay vì `pplp_mint_allocations` |

