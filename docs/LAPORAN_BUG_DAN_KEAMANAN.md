# Laporan Bug & Keamanan — Manager (kautsarmanager)

Tanggal: 28 Okt 2026. Cakupan: seluruh `src/`, `supabase_schema.sql`, migrasi, `public/`, konfigurasi build.

## A. Temuan dan perbaikan

| # | Tingkat | Temuan | Perbaikan |
|---|---|---|---|
| 1 | **Tinggi** | Hash+salt PIN 6 digit disimpan di tabel `profiles` dan bisa dibaca klien. Ruang PIN hanya 1 juta kombinasi, jadi mudah di-brute-force offline. Hash itu juga **tersalin ke cache profil lokal dan file backup JSON** (direproduksi pada kode asli: `pin_hash` masuk `getProfile()`). | PIN diverifikasi di server lewat RPC `verify_app_pin` (bcrypt via pgcrypto, tabel `app_pins` tanpa akses klien, penguncian bertingkat 60 dtk → maks 15 mnt). Kolom `pin_*` di `profiles` dihapus. Sinkronisasi profil kini memilih kolom eksplisit. |
| 2 | **Tinggi** | **Kehilangan data**: perubahan tugas/transaksi/file yang belum terunggah ditimpa snapshot cloud saat sinkronisasi (hanya wishlist yang dilindungi). Direproduksi pada kode asli: tugas baru hilang setelah sync. | Merge generik untuk semua tabel: item dengan upsert tertunda dipertahankan, item dengan delete tertunda tidak dihidupkan lagi, data lokal-saja diantrekan untuk diunggah. |
| 3 | **Tinggi** | PIN bisa diganti/dihapus tanpa PIN lama, jadi kunci aplikasi bisa dilepas siapa pun yang memegang sesi terbuka. | Ganti/hapus PIN wajib PIN saat ini (diverifikasi server dengan batas percobaan yang sama). |
| 4 | **Tinggi** | Tombol "Reset ke Data Demo Awal" sebenarnya **menghapus semua data di cloud dan semua perangkat**, hanya dengan satu `confirm`. | Diganti nama "Hapus Semua Data Akun", peringatan jelas, wajib mengetik `HAPUS`. |
| 5 | **Tinggi** | `npm run lint` gagal: error TypeScript di `authService.ts` (`Uint8Array` vs `BufferSource`). Terkonfirmasi dengan `tsc`. | Kode PIN lokal (PBKDF2) dihapus karena kini server-side. |
| 6 | Sedang | Auto-submit PIN pada digit ke-6 tidak pernah jalan (closure usang: `submitPin` melihat PIN 5 digit). | `onSubmit(pin)` menerima nilai terbaru; ada guard anti dobel-submit. |
| 7 | Sedang | Mengosongkan pengingat tugas tidak menghapusnya di cloud (`undefined` dibuang dari JSON; kelas bug sama dengan deadline wishlist). | Dikirim sebagai `null`. |
| 8 | Sedang | `user_id` di payload berasal dari cache lokal. | Payload disusun dari whitelist kolom per tabel; `user_id` selalu dari sesi aktif. Hapus storage hanya untuk path milik user. |
| 9 | Sedang | Polling tiap 8 dtk × 5 query + pembuatan signed URL untuk **semua** file tiap putaran. | Interval 30 dtk (Realtime tetap utama), signed URL dibuat saat file dibuka. |
| 10 | Sedang | Item antrean yang gagal permanen (mis. salah skema) dicoba ulang selamanya. | Dead-letter setelah error permanen/10 percobaan; ditampilkan di Pengaturan dan ikut dalam backup. |
| 11 | Sedang | "Hari ini" di notifikasi memakai zona waktu perangkat, Dashboard memakai zona waktu profil, jadi bisa berbeda. | Semua memakai zona waktu profil; selisih hari dihitung pada tanggal kalender. |
| 12 | Sedang | Backup JSON memuat dump mentah localStorage (termasuk data profil sensitif). | Backup disaring (`pin_*`, token, password dibuang) dan memuat antrean tertunda/gagal. |
| 13 | Sedang | Logout meninggalkan seluruh data pribadi di localStorage. | Sebelum logout: flush antrean; bila semua tersinkron, cache perangkat dibersihkan. Bila ada yang belum tersinkron, pengguna diperingatkan. |
| 14 | Sedang | Upload: jenis file tak didukung baru ditolak server dengan pesan kabur; `upsert: true` bisa menimpa; nama tanpa titik menghasilkan ekstensi salah. | Validasi ekstensi/ukuran di klien (sama dengan bucket), `upsert: false`. |
| 15 | Rendah | Quick-add tugas tidak membuka modal jika tab Tugas sudah aktif; flag modal bisa "bocor" ke kunjungan berikutnya. | Effect pada prop + reset saat pindah tab. |
| 16 | Rendah | ID toast `Date.now()` bisa duplikat; toast error terpotong dan hilang 2,8 dtk. | UUID, teks tidak dipotong, error tampil 7 dtk, maksimal 5 toast. |
| 17 | Rendah | Form login memakai hack `readOnly` dan `autocomplete="new-password"` yang merusak password manager. | Atribut autocomplete yang benar. |
| 18 | Rendah | Service worker: `respondWith` bisa menerima `undefined` (error saat offline untuk non-navigasi). | Selalu mengembalikan Response; versi cache v2. |
| 19 | Rendah | Manifest: `purpose: "any maskable"` digabung, `theme_color` tak cocok, shortcut `?tab=` tidak diproses. | Diperbaiki; `?tab=` kini dibaca App. |
| 20 | Rendah | `npm run dev` membuka server dev ke seluruh LAN (`--host=0.0.0.0`). | Default localhost; `npm run dev:lan` bila memang perlu. |
| 21 | Rendah | `tsconfig` tanpa `strict`; skrip `clean` memakai `require` di proyek ESM; `any` di beberapa komponen. | `strict: true`, skrip diperbaiki, tipe `NavTab`. |
| 22 | Rendah | Skema: default tema `dark` (klien `light`); fungsi trigger `SECURITY DEFINER` dapat dipanggil publik; tak ada batas panjang atau cek kepemilikan `storage_path`. | Migrasi `202610280001_...sql`. |
| 23 | Hygiene | ZIP berisi `.env.local`, riwayat `.git`, `dist/` lama, folder `Git/` (sisa Windows), lockfile kosong di induk, dan 9 dokumen lama yang saling bertentangan. | Dibersihkan. Header keamanan (CSP dll.) ditambahkan di `public/_headers`. |

## B. Yang diverifikasi dan yang TIDAK
**Diverifikasi:** `tsc --noEmit` dengan `strict` bersih (TypeScript 6.0.3 di lingkungan ini). Uji logika dengan Supabase tiruan lolos (merge sinkronisasi, `user_id` dipaksa, `null` pengingat, batas nominal, tanpa `pin_*`). Skenario #1 dan #2 direproduksi pada kode asli.

**Tidak dapat diverifikasi di lingkungan ini (tanpa jaringan, `node_modules` berisi biner Windows):**
- `npm run build` (Vite) dan `npm audit`/CVE dependensi. **Jalankan sendiri**: `npm ci && npm run lint && npm run build && npm run audit:prod`.
- Migrasi SQL belum dieksekusi pada Postgres sungguhan. Tinjau dan jalankan di project staging dulu.
- Jaminan "0 bug / 0 vulnerability" tidak bisa diberikan secara jujur oleh siapa pun. Yang ada: daftar temuan di atas dan bukti uji.

## C. Batasan yang tetap ada (diketahui, bukan bug baru)
- Kunci PIN adalah kunci **kenyamanan** pada sisi tampilan. Data tetap ada di localStorage dan sesi login tetap tersimpan, jadi bukan pengganti password atau enkripsi perangkat.
- Konflik edit bersamaan antar perangkat: *last write wins* (server menetapkan `updated_at`).
- Cache memakai localStorage (kuota ±5 MB); file harus diunggah saat online; riwayat aktivitas masih lokal; Asisten AI berbasis aturan lokal.
- Pendaftaran publik terbuka. Nonaktifkan di Supabase jika aplikasi privat.
