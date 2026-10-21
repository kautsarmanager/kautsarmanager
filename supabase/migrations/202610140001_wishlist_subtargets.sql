-- Jalankan sekali di Supabase SQL Editor untuk menyimpan rincian sub-target lintas perangkat.
-- Aman untuk data lama: sub-target default [] dan target utama lama tetap dipertahankan.
alter table public.wishlist_items
  add column if not exists subtasks jsonb not null default '[]'::jsonb;

alter table public.wishlist_items
  add column if not exists base_target_price numeric(15,2);

update public.wishlist_items
set base_target_price = target_price
where base_target_price is null;

alter table public.wishlist_items
  alter column base_target_price set default 0,
  alter column base_target_price set not null;
