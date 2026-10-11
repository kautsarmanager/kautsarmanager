# Audit & Change Log — Personal Management System

Tanggal audit: 2026-10-07

## Perbaikan yang diterapkan

### 1. Identitas pengguna / sapaan
- Dashboard sekarang menampilkan `Hai, <username akun yang sedang login>`.
- Tidak ada lagi nama hard-coded `Yazid` sebagai identitas pengguna.
- Placeholder registrasi juga tidak lagi memakai contoh username yang terlalu spesifik.

### 2. Isolasi data antar akun
**Bug penting:** sebelumnya semua data PMS memakai key `localStorage` global seperti `pms_tasks`, `pms_files`, dan `pms_profile`.

Sekarang cache memakai namespace:
`pms_tasks:<user_id>`, `pms_files:<user_id>`, dan seterusnya.

Saat instalasi lama pertama kali dibuka, tersedia migrasi satu kali dari cache global lama ke akun yang sedang aktif. Cache global lama kemudian dihapus agar akun kedua tidak mewarisinya.

### 3. Data demo yang terlihat seperti data pribadi
Akun baru sekarang mulai dari data kosong. Data contoh seperti tugas praktikum, file kuliah, dan wishlist laptop tidak lagi otomatis muncul pada akun baru.

### 4. Tanggal
Penggunaan `toISOString().split('T')[0]` untuk tanggal kalender lokal diganti dengan helper tanggal lokal. Ini mencegah tanggal bergeser satu hari pada timezone tertentu, termasuk Indonesia.

### 5. UI/UX
- Sapaan dashboard dibuat lebih natural.
- Hierarki area konten diberi lebar maksimum agar layar besar tidak terasa kosong/terlalu melebar.
- Focus state keyboard diperjelas.
- Placeholder dibuat lebih ringan.
- Dukungan `prefers-reduced-motion` ditambahkan.
- Copy autentikasi dibuat lebih seperti produk nyata dan kurang seperti template/demo.

### 6. Keamanan kredensial
`.env.example` sebelumnya berisi nilai yang tampak seperti API key nyata. Nilai tersebut sudah dihapus dan diganti placeholder.

**Tindakan yang disarankan:** jika key tersebut pernah aktif/terpublikasi, lakukan rotasi/revoke di provider terkait. Jangan commit `.env.local`.

### 7. Supabase
Sinkronisasi otomatis yang sebelumnya hanya mengambil tabel `tasks` tidak lagi dijalankan sebagai seolah-olah sinkronisasi multi-user sudah aktif.

Operasi cloud write juga dinonaktifkan sampai identitas aplikasi benar-benar terhubung dengan Supabase Auth. Ini mencegah aplikasi lokal username/PIN mengirim request yang gagal terhadap RLS dan memberi kesan palsu bahwa data sudah tersinkron.

## Bug/risiko yang masih perlu ditangani pada tahap berikutnya

1. **Autentikasi lokal bukan autentikasi server.**
   Username/PIN dan hash disimpan di browser. Ini cocok untuk proteksi lokal, bukan untuk keamanan multi-device.

2. **Referral code masih berada di frontend.**
   Kode referral yang divalidasi di browser dapat ditemukan oleh pengguna yang menginspeksi bundle. Validasi akses harus dipindahkan ke backend/Supabase Edge Function atau mekanisme server-side.

3. **Sinkronisasi lintas perangkat belum aktif.**
   Karena auth lokal belum memiliki identitas server, RLS Supabase tidak bisa menganggap `user_id` lokal sebagai `auth.uid()`.

4. **File lokal memakai object URL.**
   URL `blob:` dari file yang hanya disimpan lokal tidak bertahan setelah reload. Untuk file lintas perangkat, gunakan Supabase Storage atau backend file storage.

5. **Konflik data belum memiliki strategi.**
   Ketika sinkronisasi online/offline diaktifkan, perlu outbox + `updated_at` + conflict policy.

6. **PIN brute-force state masih dapat ditingkatkan.**
   State saat ini berada di browser dan karena itu bukan kontrol keamanan server. Untuk keamanan real, rate limit harus berada di server/auth provider.

## Langkah sinkronisasi dengan platform lain

### Fase A — Satu sumber identitas
1. Aktifkan Supabase Auth.
2. Login/register PMS menghasilkan session Supabase.
3. Jadikan `auth.users.id` sebagai satu-satunya `user_id`.
4. Buat/update profile setelah session berhasil.

### Fase B — Database
1. Pertahankan RLS pada semua tabel.
2. Tambahkan policy UPDATE/INSERT yang lengkap bila diperlukan.
3. Tambahkan index pada `user_id` dan field pencarian penting.
4. Gunakan timestamp server sebagai sumber kebenaran.

### Fase C — Sinkronisasi offline
1. Local cache tetap digunakan untuk UX cepat.
2. Perubahan masuk ke outbox.
3. Worker mengirim perubahan saat online.
4. Server mengembalikan versi terbaru.
5. Terapkan conflict strategy yang konsisten.

### Fase D — Storage
Gunakan path:
`<user_id>/<file_id>/<filename>`

Bucket sebaiknya private. Buat signed URL saat file perlu dibuka/diunduh.

### Fase E — Integrasi platform lain
Buat adapter per platform, misalnya:
- Kalender → tugas/deadline.
- Cloud drive → file.
- Task manager → tugas.
- Spreadsheet/finance → transaksi.

Jangan menghubungkan UI langsung ke banyak API. Gunakan layer `integrations/` agar setiap platform punya adapter sendiri dan kredensial tetap terisolasi.

## Verifikasi

Dependency installation pada lingkungan audit mengalami timeout jaringan, sehingga `tsc`/Vite build penuh tidak dapat dijalankan di sini. Source sudah diperiksa secara statis setelah perubahan.

Jalankan di mesin pengembangan:

```bash
npm install
npm run lint
npm run build
npm run dev
```

Kemudian uji minimal:
1. Buat akun A → pastikan dashboard `Hai, usernameA`.
2. Tambah task/finance/file/wishlist.
3. Logout.
4. Buat/login akun B → pastikan data akun A tidak muncul.
5. Login kembali A → data A tetap ada.
6. Coba tanggal/deadline dekat pergantian hari.
7. Buka DevTools dan pastikan tidak ada API key nyata di source/environment client.
