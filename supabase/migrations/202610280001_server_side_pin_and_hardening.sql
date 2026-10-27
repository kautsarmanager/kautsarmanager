-- Hardening v3: PIN diverifikasi di server, hash PIN tidak lagi dapat dibaca klien,
-- batasan data, dan pencabutan hak eksekusi fungsi internal.
-- Aman dijalankan berulang kali. Jalankan di Supabase SQL Editor.

create extension if not exists pgcrypto with schema extensions;

-- 1) Tabel PIN terpisah. RLS aktif TANPA policy => klien tidak bisa SELECT/INSERT/UPDATE langsung.
create table if not exists public.app_pins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0,
  lock_level integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.app_pins enable row level security;
revoke all on public.app_pins from anon, authenticated;

-- 2) Hash PIN lama di profiles (rawan brute-force offline) dihapus. Pengguna perlu mengatur PIN ulang.
alter table public.profiles drop column if exists pin_hash;
alter table public.profiles drop column if exists pin_salt;
alter table public.profiles drop column if exists pin_iterations;

-- 3) Fungsi internal: cek PIN + lockout bertingkat (5 gagal => kunci 60 dtk, lalu berlipat ganda, maks 15 menit).
create or replace function public._pin_check(p_uid uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r public.app_pins%rowtype; v_wait integer;
begin
  select * into r from public.app_pins where user_id = p_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_pin');
  end if;
  if r.locked_until is not null and r.locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked',
      'retry_after', ceil(extract(epoch from (r.locked_until - now())))::int);
  end if;
  if p_pin is not null and r.pin_hash = crypt(p_pin, r.pin_hash) then
    update public.app_pins set failed_attempts = 0, lock_level = 0, locked_until = null where user_id = p_uid;
    return jsonb_build_object('ok', true);
  end if;
  if r.failed_attempts + 1 >= 5 then
    v_wait := least(900, 60 * power(2, r.lock_level)::int);
    update public.app_pins
      set failed_attempts = 0, lock_level = r.lock_level + 1, locked_until = now() + make_interval(secs => v_wait)
      where user_id = p_uid;
    return jsonb_build_object('ok', false, 'reason', 'locked', 'retry_after', v_wait);
  end if;
  update public.app_pins set failed_attempts = r.failed_attempts + 1 where user_id = p_uid;
  return jsonb_build_object('ok', false, 'reason', 'wrong_pin', 'attempts_left', 4 - r.failed_attempts);
end; $$;
revoke all on function public._pin_check(uuid, text) from public, anon, authenticated;

-- 4) RPC yang boleh dipanggil pengguna login.
create or replace function public.has_app_pin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.app_pins where user_id = auth.uid());
$$;

create or replace function public.verify_app_pin(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  return public._pin_check(auth.uid(), p_pin);
end; $$;

create or replace function public.set_app_pin(p_new text, p_current text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_check jsonb;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_new is null or p_new !~ '^[0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_format');
  end if;
  if exists (select 1 from public.app_pins where user_id = v_uid) then
    v_check := public._pin_check(v_uid, p_current);
    if not (v_check->>'ok')::boolean then return v_check; end if;
  end if;
  insert into public.app_pins (user_id, pin_hash, failed_attempts, lock_level, locked_until, updated_at)
  values (v_uid, crypt(p_new, gen_salt('bf', 10)), 0, 0, null, now())
  on conflict (user_id) do update
    set pin_hash = excluded.pin_hash, failed_attempts = 0, lock_level = 0, locked_until = null, updated_at = now();
  return jsonb_build_object('ok', true);
end; $$;

create or replace function public.remove_app_pin(p_current text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid(); v_check jsonb;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if not exists (select 1 from public.app_pins where user_id = v_uid) then
    return jsonb_build_object('ok', true);
  end if;
  v_check := public._pin_check(v_uid, p_current);
  if not (v_check->>'ok')::boolean then return v_check; end if;
  delete from public.app_pins where user_id = v_uid;
  return jsonb_build_object('ok', true);
end; $$;

revoke all on function public.has_app_pin() from public, anon;
revoke all on function public.verify_app_pin(text) from public, anon;
revoke all on function public.set_app_pin(text, text) from public, anon;
revoke all on function public.remove_app_pin(text) from public, anon;
grant execute on function public.has_app_pin() to authenticated;
grant execute on function public.verify_app_pin(text) to authenticated;
grant execute on function public.set_app_pin(text, text) to authenticated;
grant execute on function public.remove_app_pin(text) to authenticated;

-- 5) Fungsi trigger tidak boleh dipanggil sebagai RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- 6) Default tema disamakan dengan klien (light) dan batasan panjang/kepemilikan data.
alter table public.profiles alter column theme set default 'light';
do $$ begin
  begin alter table public.profiles add constraint profiles_name_len check (char_length(name) between 1 and 80) not valid; exception when duplicate_object then null; end;
  begin alter table public.profiles add constraint profiles_currency_len check (char_length(currency) <= 8) not valid; exception when duplicate_object then null; end;
  begin alter table public.profiles add constraint profiles_timezone_len check (char_length(timezone) <= 64) not valid; exception when duplicate_object then null; end;
  begin alter table public.tasks add constraint tasks_title_len check (char_length(title) between 1 and 200) not valid; exception when duplicate_object then null; end;
  begin alter table public.tasks add constraint tasks_desc_len check (char_length(description) <= 5000) not valid; exception when duplicate_object then null; end;
  begin alter table public.transactions add constraint transactions_desc_len check (char_length(description) <= 500) not valid; exception when duplicate_object then null; end;
  begin alter table public.wishlist_items add constraint wishlist_name_len check (char_length(name) between 1 and 200) not valid; exception when duplicate_object then null; end;
  begin alter table public.files add constraint files_name_len check (char_length(name) between 1 and 255) not valid; exception when duplicate_object then null; end;
  begin alter table public.files add constraint files_path_owner check (storage_path like user_id::text || '/%') not valid; exception when duplicate_object then null; end;
end $$;
