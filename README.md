# Personal Management System (PMS)


Aplikasi React + TypeScript + Vite untuk mengelola tugas, keuangan, file, wishlist, dan aktivitas harian. UI dark-grey yang sudah ada dipertahankan.

## Fitur integrasi yang sudah disiapkan

- Register dan login email/password melalui Supabase Auth.
- Pemulihan sesi login saat aplikasi dibuka kembali. Satu akun dapat digunakan di beberapa perangkat.
- PostgreSQL untuk profil, tasks, transaksi, metadata file, wishlist, dan aktivitas.
- Row Level Security (RLS) untuk membatasi data per pengguna.
- Sinkronisasi cloud saat login dan Supabase Realtime untuk memperbarui data antarperangkat.
- Cache lokal `localStorage` per user ID dan antrean perubahan (outbox) yang dicoba ulang saat online.
- File disimpan di bucket Storage private dan dibuka menggunakan signed URL. Batas upload 20 MB.
- Referral secret yang sebelumnya tertanam di frontend telah dihapus. Pendaftaran saat ini terbuka; matikan public signup di Supabase jika aplikasi harus privat.

## Setup

1. Pasang Node.js versi yang didukung Vite.
2. Buat project di Supabase.
3. Salin `.env.example` menjadi `.env.local`. Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` menggunakan URL project serta publishable/anon key dari Supabase Dashboard.
4. Jangan pernah menaruh `service_role` key atau secret backend di frontend.
5. Jalankan `supabase_schema.sql` di Supabase SQL Editor. Skrip menyiapkan tabel, policy RLS, trigger profil, bucket Storage private, dan konfigurasi Realtime. Tinjau dahulu jika database sudah berisi data produksi.
6. Di Supabase Authentication, aktifkan email/password. Untuk pengembangan, sesuaikan opsi konfirmasi email; untuk produksi, gunakan penyedia email yang layak.
7. Jalankan dari folder project:

   ```bash
   npm install
   npm run lint
   npm run build
   npm run dev
   ```

8. Daftar dengan email dan password, lalu login menggunakan akun yang sama di perangkat kedua. Pastikan kedua perangkat memiliki versi aplikasi yang sudah dikonfigurasi dengan project Supabase yang sama.

## Backup dan data lama

- Akun username/PIN lama tidak otomatis diubah menjadi akun Supabase. Data global dan data cache lama tidak dihapus otomatis.
- Sebelum migrasi, buka Settings dan ekspor JSON. Backup tersebut menyertakan data lokal lama yang relevan, tetapi tidak menyertakan hash/password akun lama.
- Jangan mengimpor data lama ke akun cloud sebelum memastikan data tersebut benar-benar milik akun itu. ID lama juga mungkin tidak cocok dengan kolom UUID di database.

## Batasan yang masih ada

- Cache dan antrean offline saat ini memakai `localStorage`, bukan IndexedDB/Dexie. Karena itu kapasitasnya terbatas dan browser dapat menghapusnya. Ekspor backup berkala.
- Perubahan Tasks, Finance, Wishlist, profil, dan metadata file bisa masuk antrean saat offline lalu dicoba ulang saat online. Namun belum ada strategi konflik lengkap berbasis versi server; perubahan bersamaan dari dua perangkat bisa saling menimpa.
- File biner harus diunggah ketika online. File yang belum diunggah tidak dijamin tersedia di perangkat lain.
- Aktivitas terbaru masih lokal dan belum disinkronkan sebagai tabel aktivitas.
- AI Assistant pada prototype masih berupa logika lokal; API AI yang aman di server/Edge Function belum diimplementasikan.
- Build dan type-check penuh belum berhasil dijalankan dalam lingkungan penyusunan ZIP karena instalasi dependency mengalami timeout. Lakukan `npm install`, `npm run lint`, dan `npm run build` di komputer Anda sebelum memakai aplikasi.

## Catatan keamanan

PIN lama bukan lagi kredensial akun. Login akun memakai Supabase Auth. Tombol kunci aplikasi saat ini hanya layar jeda lokal, bukan autentikasi ulang. Pastikan RLS dan Storage policies sudah terpasang sebelum memasukkan data pribadi.
