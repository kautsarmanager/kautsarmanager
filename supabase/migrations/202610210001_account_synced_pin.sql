-- Simpan metadata PIN pada profil akun agar tersedia di semua perangkat.
alter table public.profiles add column if not exists pin_salt text;
alter table public.profiles add column if not exists pin_hash text;
alter table public.profiles add column if not exists pin_iterations integer;
