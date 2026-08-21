-- =============================================================================
-- Fit Compas — 0003: fix the role-escalation guard, then promote to admin
--
-- Run this in Supabase Studio -> SQL Editor. It replaces 0002.
--
-- WHY THIS EXISTS
-- The guard shipped in 0001 was SECURITY DEFINER and relied on is_admin(),
-- which reads auth.uid(). In the SQL Editor there is no JWT, so auth.uid() is
-- NULL, is_admin() returns false, and the guard blocked the very promotion it
-- was meant to protect. Worse, inside a SECURITY DEFINER function current_user
-- is the function *owner*, so there was no way to tell an end user apart from
-- a migration.
--
-- The fix drops SECURITY DEFINER from the guard so current_user is the actual
-- caller, and only blocks the two roles that end users ever run as.
-- =============================================================================

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
-- Deliberately NOT security definer. current_user has to be the caller's role
-- for the check below to mean anything.
set search_path = ''
as $$
begin
  -- PostgREST runs end-user requests as 'authenticated' or 'anon'.
  -- The SQL Editor runs as 'postgres'; our own server with the secret key runs
  -- as 'service_role'. Both of those are trusted and skip the guard.
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon')
     and not public.is_admin()
  then
    raise exception 'changing role is not permitted';
  end if;

  return new;
end;
$$;

-- ---------- promote ---------------------------------------------------------
-- Replace the address if you signed up with a different one.

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('trope93@gmail.com')
);

-- ---------- verify ----------------------------------------------------------
-- Expect one row with role = admin.

select p.id, u.email, p.role, p.full_name, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at;
