-- Personal Management System: Supabase schema v2
-- Run in Supabase SQL Editor. Review existing tables before applying to production.

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Pengguna',
  email text not null default '',
  currency text not null default 'IDR',
  timezone text not null default 'Asia/Jakarta',
  theme text not null default 'dark' check (theme in ('dark','light')),
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
