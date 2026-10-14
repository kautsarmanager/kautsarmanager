# Kautsarmanager — pembaruan

## Perubahan yang sudah diterapkan
- Chat AI otomatis menggulir ke pesan terbaru.
- Email di Settings dibuat hanya-baca; username tetap dapat diedit.
- Pilihan mata uang dan zona waktu disediakan sebagai dropdown.
- Kategori baru pada Task, File, Wishlist, dan Finance tidak lagi diisi otomatis; kategori kosong boleh disimpan.
- Modal Task, File, Finance, dan Wishlist dapat ditutup dengan klik area di luar panel; tombol silang tetap tersedia.
- Tombol utama tambah Task, Upload File, catat Finance, dan tambah Wishlist diperbesar.
- Konfirmasi sebelum menghapus file, wishlist, dan transaksi cashflow.
- Konfirmasi sebelum logout dari menu Settings/Sidebar.
- Form login meminta browser untuk tidak melakukan autofill email/password secara otomatis.

## Catatan yang perlu diketahui
- Mengubah pilihan mata uang saat ini menyimpan preferensi kode mata uang. Konversi nilai historis antar mata uang dengan kurs aktual belum diaktifkan; angka nominal lama tidak otomatis dikonversi karena itu membutuhkan kurs dan aturan konversi yang eksplisit.
- Sub-target wishlist dan edit Task/Wishlist belum diimplementasikan pada paket ini. Perlu perubahan model data dan sinkronisasi Supabase serta pengujian migrasi sebelum aman dipakai.
- Konfirmasi logout tidak menghapus kredensial yang disimpan oleh browser/password manager. Jika Chrome tetap mengisi email/password, hapus data login tersimpan di Password Manager Chrome. Password tersimpan pada browser perangkat bukan berarti akun bisa diakses dari perangkat lain.
- Build tidak dapat diverifikasi di lingkungan penyuntingan ini karena instalasi dependency tidak selesai dan Vite tidak tersedia setelah timeout. Jalankan `npm ci` lalu `npm run build` di komputer lokal sebelum push.

## Sinkronisasi/deploy
1. Simpan cadangan data dari Settings → Export JSON.
2. Ekstrak ZIP ini ke folder baru, jangan menimpa folder lama sebelum membuat backup.
3. Salin `.env.local` dari proyek lama secara manual ke folder baru. File itu sengaja tidak disertakan dalam ZIP. Jangan pernah commit file ini ke GitHub.
4. Jalankan `npm ci`, kemudian `npm run build`.
5. Jika build sukses, salin perubahan ke repo lokal `C:\AL KAUTSAR\kautsarmanager` atau gunakan folder hasil ekstrak sebagai repo baru setelah memastikan remote benar.
6. Jalankan `git status`, `git add .`, `git commit -m "Improve app settings and confirmations"`, lalu `git push`.
7. Cloudflare Pages akan build ulang otomatis dari branch `main`. Pastikan environment variables `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di Cloudflare Pages sama dengan `.env.local`.
8. Uji login, logout, create task, finance, upload file, wishlist, dan buka aplikasi dari perangkat kedua.

## Tambahan lanjutan
- Task sekarang dapat diedit lewat ikon pensil; status task dipertahankan saat mengubah detail. Hapus task meminta konfirmasi.
- Wishlist sekarang dapat diedit, termasuk nama, deskripsi, kategori, harga target, tabungan awal, tanggal, dan daftar sub-target.
- Sub-target wishlist tampil sebagai checklist yang dapat dicentang dan progres checklist ditampilkan pada kartu.
- Catatan sinkronisasi: sub-target saat ini disimpan lokal pada data wishlist; payload Supabase sengaja tidak mengirim field `subtasks` karena schema database yang ada belum dipastikan memiliki kolom JSONB untuk itu. Agar checklist tersinkron antarperangkat, schema Supabase perlu migrasi kolom `subtasks` bertipe JSONB dan proses sync perlu diperbarui.
- Verifikasi sintaks TypeScript/TSX selesai tanpa diagnostic transpile. Build penuh belum terverifikasi karena dependency Vite tidak tersedia di cache offline; `npm ci --offline` gagal karena paket Vite belum tercache. Wajib jalankan `npm ci` dan `npm run build` di komputer lokal sebelum deploy.


## Pembaruan tambahan (14 Oktober 2026)
- Panel tugas: klik satu tugas untuk melihat detail lengkap; tombol Edit tugas tersedia di dalam panel detail. Tombol lingkaran tetap untuk menandai selesai.
- Label menu tugas memakai bahasa Indonesia, termasuk judul, tombol tambah, pencarian, dan jumlah tugas.
- Wishlist: sub-target sekarang punya nama, nominal dana, checklist, dan total target otomatis (dana utama + seluruh dana sub-target).
- Login: kolom email/password tidak memakai nilai yang disimpan oleh state aplikasi, autocomplete diperketat, dan berpindah tab login/daftar mengosongkan input. Browser/password manager tertentu masih dapat mengabaikan petunjuk autocomplete.
- Untuk sinkronisasi sub-target dan dana antarperangkat, jalankan SQL di `supabase/migrations/202610140001_wishlist_subtargets.sql` pada Supabase SQL Editor sebelum memakai fitur ini di produksi.
