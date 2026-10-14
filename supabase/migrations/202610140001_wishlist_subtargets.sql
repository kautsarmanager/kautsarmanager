-- Jalankan sekali di Supabase SQL Editor untuk menyimpan rincian sub-target lintas perangkat.
-- Aman untuk data lama: nilai default [] dan base_target_price diisi dari target_price.
alter table public.wishlist_items
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

alter table public.wishlist_items
  add column if not exists base_target_price numeric;

update public.wishlist_items
set base_target_price = target_price
where base_target_price is null;
