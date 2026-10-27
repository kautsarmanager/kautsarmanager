# Langkah Sinkronisasi dengan Platform Lain

Prinsipnya: **satu project Supabase, satu akun, banyak klien**. Setiap platform memakai URL + anon key yang sama dan masuk dengan akun yang sama. RLS memastikan tiap pengguna hanya melihat datanya sendiri.

## 1. Siapkan backend (sekali saja)
1. Buat project Supabase.
2. SQL Editor → jalankan `supabase_schema.sql` (project baru). Untuk project yang sudah berjalan, jalankan migrasi di `supabase/migrations/` secara berurutan, **terakhir `202610280001_server_side_pin_and_hardening.sql`**. Jalankan SQL **sebelum** men-deploy klien baru. Setelah migrasi, PIN lama tidak berlaku dan pengguna perlu mengatur PIN ulang.
3. Authentication → Providers: aktifkan Email. Di *Settings*: atur panjang password minimum dan aktifkan *leaked password protection* bila tersedia di paket Anda. Nonaktifkan *Allow new users to sign up* jika aplikasi privat.
4. Authentication → URL Configuration: isi **Site URL** dan **Redirect URLs** untuk semua klien: domain produksi (`https://app.contoh.id`), `http://localhost:3000`, serta `http://localhost` / skema deep-link aplikasi mobile bila memakai Capacitor.
5. Database → Replication: pastikan tabel `tasks, transactions, files, wishlist_items, profiles` ada di publikasi `supabase_realtime` (skema sudah mencoba menambahkannya).
6. Salin Project URL dan **anon/publishable key** (JANGAN pernah `service_role`).

## 2. Web + PWA (Android, iOS, Windows, macOS, Linux)
1. `cp .env.example .env.local`, isi dua variabel `VITE_...`.
2. `npm ci && npm run lint && npm run build`.
3. Cloudflare Pages: build command `npm run build`, output `dist`, tambahkan variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Production dan Preview). `public/_headers` otomatis diterapkan (CSP, HSTS, dll.).
4. Buka URL produksi di tiap perangkat → login akun yang sama → *Install / Add to Home Screen* (Chrome/Edge/Safari). Itu sudah platform Android, iOS, dan desktop tanpa kode tambahan.

## 3. Aplikasi native (opsional, Capacitor)
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init Manager id.kautsar.manager --web-dir=dist
npm run build
npx cap add android && npx cap add ios
npx cap sync
npx cap open android   # atau: npx cap open ios
```
Daftarkan skema/domain aplikasi di Redirect URLs Supabase. Service worker dan localStorage tetap berfungsi di WebView, dan sinkronisasi memakai kode yang sama.

## 4. Klien/aplikasi lain (skrip, spreadsheet, kalender)
- Gunakan REST Supabase dengan **JWT pengguna** (bukan service_role), RLS tetap berlaku:
  ```bash
  curl "$SUPABASE_URL/rest/v1/tasks?select=*&deleted_at=is.null" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $USER_ACCESS_TOKEN"
  ```
- Integrasi yang memerlukan rahasia (Google Calendar, Notion, webhook): buat **Supabase Edge Function** yang menyimpan rahasia di *Secrets* server; klien memanggil fungsi itu dengan JWT pengguna. Jangan menaruh kunci pihak ketiga di variabel `VITE_...`.
- Aturan data agar semua platform konsisten: `id` = UUID dari klien, penghapusan = isi `deleted_at` (soft delete), `updated_at` diatur server, tanggal berformat `YYYY-MM-DD`, nominal `numeric(15,2)`.

## 5. Uji sinkronisasi (checklist)
1. Perangkat A dan B login akun yang sama. Buat tugas di A → muncul di B (Realtime, atau ≤30 dtk).
2. Matikan jaringan di A, buat tugas, nyalakan lagi → muncul di B. Pengaturan menampilkan "Semua perubahan sudah tersinkron".
3. Hapus tugas di B → hilang di A. Kosongkan pengingat di A → kosong di B.
4. Akun C: pastikan data akun A tidak terlihat.
5. Atur PIN di A → B terkunci/dibuka dengan PIN yang sama; 5 PIN salah → terkunci 60 dtk.
