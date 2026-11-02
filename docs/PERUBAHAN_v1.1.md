# Perubahan v1.1.0

Tidak ada perubahan skema database. Tidak perlu menjalankan migrasi SQL baru.

## Fitur baru
1. **Geser urutan waktu catatan Finance (Cashflow).**
   Tahan lama (~0,45 dtk) pada sebuah catatan, lalu geser ke posisi lain. Keyboard: `Alt + ↑/↓`.
   - Hanya mengubah *urutan waktu* di dalam hari yang sama; nominal, tanggal, kategori tidak berubah.
   - Filter (jenis transaksi, periode) tetap berfungsi. Catatan yang tersaring tetap di slot-nya.
   - Berlaku untuk mode urut "terbaru" dan "terlama" (mode nominal menonaktifkannya).
   - Implementasi: urutan dalam satu hari ditentukan oleh `created_at`; menggeser = membagi ulang
     kumpulan `created_at` hari itu ke urutan baru (`dataService.reorderTransactions`), lalu tersinkron
     lewat jalur upsert biasa. Karena itu tidak butuh kolom baru.
   - Catatan yang berbeda hari tidak bisa ditukar (tanggal transaksi sengaja tidak diubah).
2. **Kolom kategori kosong** setiap kali "Catat Transaksi" dibuka (juga Tugas dan Upload File).
3. **Perbaikan tanggal "hari ini" yang telat beberapa jam** (lihat di bawah).

## Perbaikan bug
- **Tanggal/"Hari ini" basi.** Nilai tanggal dihitung sekali saat halaman dibuka, sehingga PWA yang dibiarkan
  terbuka melewati tengah malam tetap menganggap hari kemarin sebagai "hari ini" (form tanggal, cashflow,
  ringkasan dashboard, urgensi tugas). Kini semua memakai hook `useToday()` yang diperbarui saat hari berganti,
  saat tab kembali aktif, saat online, dan saat zona waktu berubah. Form transaksi mengambil tanggal segar
  setiap dibuka, ada tombol "Hari ini", dan label "Hari ini/Kemarin" selalu akurat.
- **Zona waktu akun ≠ perangkat.** Bila zona waktu di profil (mis. `UTC`) berbeda dengan perangkat (WIB),
  tanggal terlambat tepat sebesar selisihnya (7 jam). Pengaturan > Preferensi Regional kini punya pilihan zona
  waktu, opsi **Otomatis (ikuti perangkat)** (default untuk akun baru), dan peringatan bila terdeteksi berbeda.
- Modal Tugas: tombol X / klik di luar tidak lagi meninggalkan mode edit (sebelumnya "Tambah" bisa menimpa tugas lama).
- Pengingat tugas kini sungguh berbunyi pada jam yang dipilih (zona waktu profil); banner in-app tampil walau
  izin notifikasi browser ditolak; status "dibaca" tidak lagi permanen (reset bila urgensi/deadline berubah) dan
  langsung terlihat di panel.
- Mata uang & zona waktu bisa diubah lagi di Pengaturan.
- Upload: daftar format di dialog sama dengan yang diterima server (PDF, DOCX, PPTX, XLSX, JPG, PNG, WEBP, TXT).
- Pencarian global terbaca di tema terang.
- AI Assistant: `**tebal**` dirender benar; id pesan unik.
- "Lupa PIN → keluar" kini memakai alur logout lengkap (sinkron antrean + bersihkan cache lokal).
- Persentase wishlist konsisten di semua layar (target 0 = 0%); sisa teks "Kuliah"/"matdis" dibersihkan.

## Catatan
- Folder `Git/` (sisa Windows) dihapus dari proyek. Agar hilang juga dari repo: `git rm -r --cached Git`.
- `dist/` dihapus (hasil build lama); jalankan `npm run build`.
