/** Persentase progres wishlist; dipakai di semua layar agar angkanya konsisten. Target 0 = 0%. */
export function wishlistPercent(item: { saved_amount: number; target_price: number }): number {
  const target = Number(item.target_price) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((Number(item.saved_amount) || 0) / target) * 100)));
}
