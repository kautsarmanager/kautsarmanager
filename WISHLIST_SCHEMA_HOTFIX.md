# Perbaikan error skema Wishlist

Error produksi: `PGRST204: Could not find the 'base_target_price' column of 'wishlist_items' in the schema cache`.

Payload upsert Wishlist disesuaikan dengan kolom yang terlihat pada tabel Supabase pengguna, dengan menghapus `base_target_price` dan `subtasks` dari payload agar operasi CRUD tidak gagal karena kolom yang belum ada.

Catatan: fitur sub-target yang memakai `base_target_price`/`subtasks` tidak akan tersimpan lintas perangkat selama kolom tersebut belum tersedia. Jika fitur sub-target memang harus sinkron, periksa dan terapkan migrasi `supabase/migrations/202610140001_wishlist_subtargets.sql` setelah memeriksa isinya. Tidak perlu membuat tabel baru.
