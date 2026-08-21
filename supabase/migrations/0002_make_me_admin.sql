-- =============================================================================
-- Fit Compas — 0002: promote one account to admin
--
-- Run this AFTER you have created your account through the signup form in the
-- app. Replace the email with the one you signed up with.
--
-- This has to be done in SQL rather than in the app: the role-escalation guard
-- in 0001 blocks any non-admin from setting role = 'admin', which is exactly
-- what stops a paying client from promoting themselves.
-- =============================================================================

update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where lower(email) = lower('trope93@gmail.com')
);

-- Verify — you should see role = admin on your row.
select p.id, u.email, p.role, p.full_name, p.created_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at;
