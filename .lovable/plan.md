

# Sửa nhãn "Camly Coin" → "FUN" trong MintActionRow

## Vấn đề
Trong phần expanded detail của MintActionRow (dòng 213), label hiển thị **"Camly Coin"** nhưng đây là trang Mint FUN Money. Theo mô hình Hybrid, `final_reward` ở đây đại diện cho phần thưởng FUN được tính từ Light Score, không phải Camly Coin.

## Thay đổi

| File | Dòng | Cũ | Mới |
|------|------|----|-----|
| `src/components/mint/MintActionRow.tsx` | 213 | `Camly Coin:` | `FUN:` |

Chỉ 1 dòng thay đổi duy nhất.

