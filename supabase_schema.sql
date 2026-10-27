-- Personal Management System: Supabase schema v3 (server-side PIN + hardening)
-- Run in Supabase SQL Editor. Review existing tables before applying to production.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Pengguna',
  email text not null default '',
  currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  theme text not null default 'light' check (theme in ('dark','light')),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text not null default '', deadline date not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  category text not null default 'Umum', reminder text, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income','expense')), amount numeric(15,2) not null check (amount >= 0),
  category text not null, description text not null, transaction_date date not null, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, category text not null default 'Kuliah', storage_path text not null,
  file_type text not null, file_size bigint not null default 0, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, description text not null default '', category text not null default 'Umum',
  target_price numeric(15,2) not null default 0 check (target_price >= 0), saved_amount numeric(15,2) not null default 0 check (saved_amount >= 0),
  base_target_price numeric(15,2) not null default 0 check (base_target_price >= 0),
  subtasks jsonb not null default '[]'::jsonb,
  deadline date, completed boolean not null default false, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type text not null, title text not null, action text not null, timestamp timestamptz not null default now()
);

-- Upgrade tables created by the previous prototype schema without dropping data.
alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.transactions add column if not exists deleted_at timestamptz;
alter table public.files add column if not exists deleted_at timestamptz;
alter table public.files add column if not exists updated_at timestamptz not null default now();
alter table public.wishlist_items add column if not exists deleted_at timestamptz;
alter table public.wishlist_items add column if not exists subtasks jsonb not null default '[]'::jsonb;
alter table public.wishlist_items add column if not exists base_target_price numeric(15,2) not null default 0;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.tasks add column if not exists updated_at timestamptz not null default now();
alter table public.transactions add column if not exists updated_at timestamptz not null default now();
alter table public.wishlist_items add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email) values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)), coalesce(new.email,''))
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- RLS policies are dropped/recreated so this script can be re-run.
do $$ declare t text; p record; begin
  foreach t in array array['profiles','tasks','transactions','files','wishlist_items','activities'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
    if t = 'profiles' then
      execute 'create policy profiles_select_own on public.profiles for select using (auth.uid() = id)';
      execute 'create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id)';
      execute 'create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';
    else
      execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t||'_select_own', t);
      execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t||'_insert_own', t);
      execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t||'_update_own', t);
      execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t||'_delete_own', t);
    end if;
  end loop;
end $$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at before update on public.files for each row execute function public.set_updated_at();
drop trigger if exists wishlist_set_updated_at on public.wishlist_items;
create trigger wishlist_set_updated_at before update on public.wishlist_items for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

create index if not exists tasks_user_updated_idx on public.tasks(user_id, updated_at desc);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists files_user_created_idx on public.files(user_id, created_at desc);
create index if not exists wishlist_user_updated_idx on public.wishlist_items(user_id, updated_at desc);
create index if not exists activities_user_timestamp_idx on public.activities(user_id, timestamp desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pms-files','pms-files',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = 20971520;

drop policy if exists pms_files_select_own on storage.objects;
drop policy if exists pms_files_insert_own on storage.objects;
drop policy if exists pms_files_update_own on storage.objects;
drop policy if exists pms_files_delete_own on storage.objects;
create policy pms_files_select_own on storage.objects for select to authenticated using (bucket_id='pms-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pms_files_insert_own on storage.objects for insert to authenticated with check (bucket_id='pms-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pms_files_update_own on storage.objects for update to authenticated using (bucket_id='pms-files' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id='pms-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy pms_files_delete_own on storage.objects for delete to authenticated using (bucket_id='pms-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime is optional; enable it in Dashboard if you want live cross-device updates.


-- Add tables to Supabase Realtime publication if they are not already present.
do $$ declare tbl text; begin
  foreach tbl in array array['tasks','transactions','files','wishlist_items','profiles'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception when duplicate_object then null; when undefined_object then raise notice 'Publication supabase_realtime is unavailable; enable Realtime in Dashboard.'; end;
  end loop;
end $$;

-- ===== Hardening v3 (PIN server-side, constraints, revoke) =====
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
