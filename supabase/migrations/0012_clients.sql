-- =============================================================================
-- Fit Compas — 0012: client assignments and trainer-only notes (feature 12)
--
-- Hand-written rather than generated, for the same reason 0010 is: both tables
-- need their RLS in the same migration that creates them. A table that lands in
-- `public` without policies is readable and writable by anyone holding the
-- publishable key, and that key ships to the browser by design.
--
-- Idempotent: running it twice is safe.
-- =============================================================================

-- ---------- enum ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'assignment_status') then
    create type public.assignment_status as enum
      ('active', 'paused', 'completed', 'cancelled');
  end if;
end
$$;

-- ---------- assignments -----------------------------------------------------
-- One row per "this client is following this program from this date".
--
-- The whole schedule is derived from `start_date` plus the program grid: day N
-- after the start is week floor(N / days_per_week), day N mod days_per_week.
-- No materialised calendar rows — a plan that is a pure function of one date
-- cannot drift out of sync with the program it points at, and moving the whole
-- plan a week later is one UPDATE instead of a rewrite of 84 rows.
--
-- `program_id` cascades: deleting a program a client follows drops the
-- assignment with it. The alternative (restrict) turns a delete elsewhere in
-- the admin into an unhandled constraint error, and there is no history here
-- worth keeping alive past the program itself.

create table if not exists public.client_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  program_id  uuid not null references public.programs (id) on delete cascade,

  status      public.assignment_status not null default 'active',

  -- The calendar day week 1 / day 1 falls on. A plain date, not a timestamp:
  -- "which day of the plan is it" must not depend on anyone's clock.
  start_date  date not null,

  -- Set when the plan is paused, cleared on resume. Resuming shifts
  -- `start_date` forward by the paused span, so a fortnight off does not leave
  -- the client two weeks behind their own plan.
  paused_on   date,
  ended_on    date,

  -- Why this program, in the trainer's words. Never shown to the client, same
  -- as client_notes below.
  note        text,

  assigned_by uuid references public.profiles (id) on delete set null,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.client_assignments is
  'Which program a client is following, and from which day. Feature 12.';

-- At most one live plan per client. A database fact rather than a check in the
-- action: two active plans would make "what is today" ambiguous, and the admin
-- UI is not the only thing that will ever write here.
create unique index if not exists client_assignments_one_live
  on public.client_assignments (user_id)
  where status in ('active', 'paused');

create index if not exists client_assignments_program_idx
  on public.client_assignments (program_id);

create index if not exists client_assignments_user_idx
  on public.client_assignments (user_id, created_at desc);

drop trigger if exists client_assignments_touch_updated_at on public.client_assignments;
create trigger client_assignments_touch_updated_at
  before update on public.client_assignments
  for each row execute function public.touch_updated_at();

-- ---------- trainer notes ---------------------------------------------------
-- Deliberately not visible to the client. That is the entire point of the
-- table: a coach writes "knee still bothering them, keep squats light" and it
-- is for the coach. There is therefore no select policy for the owner — only
-- for admins — and no client-facing screen reads it.

create table if not exists public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  author_id  uuid references public.profiles (id) on delete set null,

  body       text not null,

  -- Pinned notes stay at the top of the list: allergies, injuries, the things
  -- that must be read before writing the next block.
  pinned     boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.client_notes is
  'Coach notes about a client. Never exposed to the client. Feature 12.';

create index if not exists client_notes_user_idx
  on public.client_notes (user_id, pinned desc, created_at desc);

drop trigger if exists client_notes_touch_updated_at on public.client_notes;
create trigger client_notes_touch_updated_at
  before update on public.client_notes
  for each row execute function public.touch_updated_at();

-- ---------- RLS -------------------------------------------------------------

alter table public.client_assignments enable row level security;
alter table public.client_notes       enable row level security;

drop policy if exists "client_assignments_admin_all"  on public.client_assignments;
drop policy if exists "client_assignments_select_own" on public.client_assignments;
drop policy if exists "client_notes_admin_all"        on public.client_notes;

create policy "client_assignments_admin_all"
  on public.client_assignments for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

-- The client may see which program they are on and when it started; feature 13
-- renders exactly that. They may not write it — the plan is the trainer's.
create policy "client_assignments_select_own"
  on public.client_assignments for select to authenticated
  using (auth.uid() = user_id);

create policy "client_notes_admin_all"
  on public.client_notes for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

-- No policy of any kind for the note's subject. Absence is the rule here.
