export interface ChronoLike { id: string; transaction_date: string; created_at: string }

const toMs = (value: string): number => { const t = Date.parse(value); return Number.isFinite(t) ? t : 0; };
const dayOf = (value: string): string => String(value || '').slice(0, 10);

/**
 * Urutan WAKTU catatan (naik = terlama dulu): tanggal transaksi, lalu urutan dalam hari itu.
 * Urutan dalam satu hari ditentukan oleh `created_at`; karena itu menggeser catatan (drag)
 * cukup menata ulang `created_at`, tanpa perlu kolom baru di database.
 * created_at diparse sebagai waktu (bukan dibandingkan sebagai teks) karena format lokal
 * (…Z) dan format Postgres (…+00:00) berbeda.
 */
export function compareChrono(a: ChronoLike, b: ChronoLike): number {
  return dayOf(a.transaction_date).localeCompare(dayOf(b.transaction_date))
    || toMs(a.created_at) - toMs(b.created_at)
    || a.id.localeCompare(b.id);
}

/**
 * Menggabungkan urutan baru dari catatan yang TERLIHAT (setelah filter) ke urutan lengkap satu hari.
 * Catatan yang tersaring tetap di slot-nya; hanya slot milik catatan terlihat yang ditata ulang.
 * Semua parameter berurutan kronologis naik (terlama → terbaru).
 */
export function mergeVisibleOrder(fullChrono: string[], visibleNewChrono: string[]): string[] {
  const visible = new Set(visibleNewChrono);
  let cursor = 0;
  return fullChrono.map((id) => (visible.has(id) ? visibleNewChrono[cursor++] ?? id : id));
}

/**
 * Membagi ulang kumpulan `created_at` yang sama ke urutan baru. Hasilnya naik ketat (tanpa kembar),
 * sehingga urutan selalu deterministik di semua perangkat.
 */
export function redistributeTimestamps(createdAt: string[]): string[] {
  const stamps = createdAt.map(toMs).sort((x, y) => x - y);
  for (let i = 1; i < stamps.length; i += 1) if (stamps[i] <= stamps[i - 1]) stamps[i] = stamps[i - 1] + 1;
  return stamps.map((ms) => new Date(ms).toISOString());
}

export { toMs as timestampMs };
