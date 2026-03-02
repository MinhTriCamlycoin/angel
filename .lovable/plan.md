

## Fix check constraint cho `pplp_mint_requests` status

### Vấn đề
Bảng `pplp_mint_requests` có check constraint chỉ cho phép: `pending`, `signed`, `submitted`, `minted`, `expired`, `rejected`. Các status mới cho multisig (`pending_sig`, `signing`, `confirmed`, `failed`) chưa được thêm vào.

### Thay đổi

**Database Migration** — Cập nhật check constraint:
```sql
ALTER TABLE pplp_mint_requests DROP CONSTRAINT pplp_mint_requests_status_check;
ALTER TABLE pplp_mint_requests ADD CONSTRAINT pplp_mint_requests_status_check 
  CHECK (status = ANY (ARRAY[
    'pending', 'pending_sig', 'signing', 'signed', 
    'submitted', 'confirmed', 'minted', 'expired', 'rejected', 'failed'
  ]));
```

Sau khi migration chạy xong, sẽ gọi lại edge function `pplp-mint-fun` để tạo mint request test cho `angelthutrang`.

