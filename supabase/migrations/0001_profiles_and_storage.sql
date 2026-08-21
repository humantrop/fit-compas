-- =============================================================================
-- Fit Compas — 0001: profiles, role guard, storage buckets
--
-- Run this once in Supabase Studio -> SQL Editor -> New query -> Run.
-- It is idempotent: running it twice is safe.
-- =============================================================================

-- ---------- enums -----------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'client');
  end if;

  if not exists (select 1 from pg_type where typname = 'unit_system') then
    create type public.unit_system as enum ('metric', 'imperial');
  end if;
end
$$;

-- ---------- profiles --------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role   not null default 'client',
  full_name    text,
  avatar_url   text,
  locale       text check (locale in ('sr', 'en', 'ru')),
  units        public.unit_system not null default 'metric',
  onboarded_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. Created automatically by handle_new_user().';

-- ---------- updated_at ------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------- role helper -----------------------------------------------------
-- SECURITY DEFINER on purpose: it runs as the function owner and therefore
-- bypasses RLS. Without that, a policy on profiles that calls this function
-- would recurse into itself.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- new user -> profile row ----------------------------------------
-- full_name and locale ride along in raw_user_meta_data from signUpAction.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'locale', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- privilege escalation guard --------------------------------------
-- The "update own profile" policy below would otherwise let any client set
-- their own role to 'admin'. This blocks the role column specifically.

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'changing role is not permitted';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_no_role_escalation on public.profiles;
create trigger profiles_no_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ---------- RLS -------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_select_admin"
  on public.profiles for select to authenticated
  using (public.is_admin());

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No insert policy: rows come from the trigger only.
-- No delete policy: deleting the auth user cascades.

-- ---------- storage buckets -------------------------------------------------
-- file_size_limit on exercise-videos is 50 MB because that is the hard cap on
-- the Supabase Free plan. Raise it here after upgrading, or move the bucket to
-- Mux/Bunny through the VideoProvider interface.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-videos', 'exercise-videos', false, 52428800,
   array['video/mp4', 'video/quicktime', 'video/webm']),
  ('exercise-thumbnails', 'exercise-thumbnails', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('progress-photos', 'progress-photos', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------- storage policies ------------------------------------------------

drop policy if exists "videos_admin_all"    on storage.objects;
drop policy if exists "thumbs_public_read"  on storage.objects;
drop policy if exists "thumbs_admin_write"  on storage.objects;
drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_own_write"   on storage.objects;
drop policy if exists "progress_own_read"   on storage.objects;
drop policy if exists "progress_own_write"  on storage.objects;
drop policy if exists "progress_admin_read" on storage.objects;

-- Exercise videos: admin uploads. Clients never read this bucket directly —
-- playback goes through a short-lived signed URL minted server-side after the
-- subscription check.
create policy "videos_admin_all"
  on storage.objects for all to authenticated
  using      (bucket_id = 'exercise-videos' and public.is_admin())
  with check (bucket_id = 'exercise-videos' and public.is_admin());

create policy "thumbs_public_read"
  on storage.objects for select to public
  using (bucket_id = 'exercise-thumbnails');

create policy "thumbs_admin_write"
  on storage.objects for all to authenticated
  using      (bucket_id = 'exercise-thumbnails' and public.is_admin())
  with check (bucket_id = 'exercise-thumbnails' and public.is_admin());

create policy "avatars_public_read"
  on storage.objects for select to public
  using (bucket_id = 'avatars');

-- Path convention: avatars/{user_id}/file.jpg
create policy "avatars_own_write"
  on storage.objects for all to authenticated
  using      (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars'
              and (storage.foldername(name))[1] = auth.uid()::text);

-- Path convention: progress-photos/{user_id}/file.jpg
create policy "progress_own_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos'
         and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress_own_write"
  on storage.objects for all to authenticated
  using      (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos'
              and (storage.foldername(name))[1] = auth.uid()::text);

create policy "progress_admin_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and public.is_admin());
