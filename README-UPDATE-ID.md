# Kautsar Manager — versi pembaruan

## Perubahan
- Penyegaran visual tanpa garis tepi dekoratif; kartu dibedakan melalui warna permukaan, jarak, dan bayangan.
- Fokus keyboard tetap terlihat.
- Layar kunci tidak lagi menyediakan tombol “Lanjutkan” yang melewati PIN. Karena aplikasi belum memiliki validasi PIN yang nyata, pengguna harus keluar lalu login kembali.
- File `.env.local`, folder `.git`, `node_modules`, dan `dist` tidak disertakan demi keamanan dan ukuran paket.

## Jalankan lokal
1. Instal Node.js versi LTS yang kompatibel dengan Vite 8 (Node.js 20.19+ atau 22.12+).
2. Ekstrak ZIP.
3. Salin `.env.example` menjadi `.env.local`.
4. Isi kredensial proyek Supabase milik Anda pada `.env.local`.
5. Jalankan:
   ```bash
   npm install
   npm run lint
   npm run build
   npm run dev
   ```

## Sinkronisasi antarperangkat
Aplikasi menggunakan Supabase sebagai backend cloud (lihat `src/services/supabaseClient.ts` dan `src/services/dataService.ts`).

1. Buka proyek Supabase yang benar dan pastikan URL serta publishable/anon key di `.env.local` berasal dari proyek tersebut.
2. Jalankan skema SQL `supabase_schema.sql` di SQL Editor Supabase, lalu jalankan migrasi tambahan di `supabase/migrations/` sesuai urutan nama file. Periksa isi migrasi sebelum menjalankannya.
3. Pastikan tabel memiliki Row Level Security (RLS) aktif dan kebijakan membatasi setiap baris ke `auth.uid()` pemilik data. Jangan menonaktifkan RLS untuk membuat sinkronisasi “berhasil”.
4. Di Supabase Authentication, atur URL situs dan redirect URL untuk localhost serta domain produksi Anda.
5. Deploy frontend ke hosting HTTPS (mis. Vercel/Netlify) dan masukkan `VITE_SUPABASE_URL` serta `VITE_SUPABASE_ANON_KEY` di environment variables hosting. Variabel `VITE_*` bersifat publik; jangan pernah menaruh `service_role` key atau password database di frontend.
6. Login dengan akun yang sama pada perangkat berbeda. Uji tambah/edit/hapus data, logout/login, dan konflik ketika dua perangkat mengubah item yang sama.
7. Untuk penyimpanan berkas lintas perangkat, pastikan bucket Supabase Storage dan policy aksesnya sudah dibuat; metadata tabel saja tidak otomatis mengunggah berkas ke cloud.

## Catatan penting
- ZIP ini belum dapat membuktikan konfigurasi Supabase aktif karena `.env.local` sengaja dihilangkan. Buat ulang dari `.env.example`.
- Sinkronisasi lintas perangkat bergantung pada implementasi `dataService.ts`, skema tabel, policy RLS, dan Storage. Lakukan pengujian build dan data sebelum mengganti versi produksi.
- Jangan commit `.env.local` ke Git. Jika kredensial yang pernah dibagikan adalah rahasia atau service-role key, rotasi segera di dashboard penyedia.
