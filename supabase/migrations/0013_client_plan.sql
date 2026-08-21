-- =============================================================================
-- Fit Compas — 0013: the client's own plan (feature 13)
--
-- Run once in Supabase Studio -> SQL Editor -> New query -> Run.
-- Idempotent: running it twice is safe.
--
-- Feature 12 gave the trainer a calendar that is a pure function of one date:
-- `client_assignments.start_date` plus the program grid. Nothing is stored per
-- day, which is why moving a whole plan is one UPDATE. This migration adds the
-- two things the *client* needs on top of that, and neither of them undoes
-- that property:
--
--   1. `plan_day_moves` — a sparse list of exceptions. The derived calendar
--      stays the base truth and a move is a diff against it, so a plan with no
--      moves still costs zero rows and a program edited by the trainer still
--      flows through to everybody.
--
--   2. `workout_sessions.logged_manually` — a day the client says they trained
--      without opening the runner.
--
-- On (2): the alternative was a `done` flag on the move row, and it is wrong.
-- Every number in the app — the streak, the week strip, the trainer's schedule
-- column — is read out of `workout_sessions`. A completion recorded anywhere
-- else is a second source of truth for "did I train on Tuesday", and the two
-- screens would eventually disagree. So a manual mark writes a real session
-- row with zero sets, zero volume and zero seconds, which is exactly what is
-- known about it, and the flag is what lets the app label it as self-reported
-- and lets "undo" delete it without ever touching a session the runner wrote.
-- =============================================================================

-- ---------- self-reported sessions ------------------------------------------
-- Owned by 0010; this is one added column rather than a table of its own,
-- because a self-reported workout is a workout.

alter table public.workout_sessions
  add column if not exists logged_manually boolean not null default false;

comment on column public.workout_sessions.logged_manually is
  'True when the client ticked the day off instead of running it. Feature 13.';

-- ---------- moved days ------------------------------------------------------
-- "Friday's session happens on Sunday this week."
--
-- Keyed by the *derived* day, not by a program_days row: the same program day
-- recurs for every client on it, and what moved is this client's occurrence of
-- it. Deleting the assignment drops the exceptions with it, which is correct —
-- they mean nothing without the plan they are diffing against.

create table if not exists public.plan_day_moves (
  id            uuid primary key default gen_random_uuid(),

  assignment_id uuid not null
                  references public.client_assignments (id) on delete cascade,

  -- Denormalised from the assignment so RLS is a column comparison rather than
  -- a subquery on every row read. The two can never diverge: nothing updates
  -- either of them after the insert.
  user_id       uuid not null references public.profiles (id) on delete cascade,

  -- Where the plan put it, and where it actually happens.
  from_day      date not null,
  to_day        date not null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint plan_day_moves_distinct check (from_day <> to_day)
);

comment on table public.plan_day_moves is
  'Client-moved plan days. Sparse diff against the derived calendar. Feature 13.';

-- Both ends unique, which is what keeps applying the moves unambiguous: one
-- day cannot be moved to two places, and two workouts cannot land on the same
-- day. Without these the overlay would need a tie-break rule, and any rule it
-- picked would be invisible to the person who created the collision.
create unique index if not exists plan_day_moves_from_key
  on public.plan_day_moves (assignment_id, from_day);

create unique index if not exists plan_day_moves_to_key
  on public.plan_day_moves (assignment_id, to_day);

create index if not exists plan_day_moves_user_idx
  on public.plan_day_moves (user_id, to_day);

drop trigger if exists plan_day_moves_touch_updated_at on public.plan_day_moves;
create trigger plan_day_moves_touch_updated_at
  before update on public.plan_day_moves
  for each row execute function public.touch_updated_at();

-- ---------- RLS -------------------------------------------------------------
--
-- Verify before pushing:
--   curl -H "apikey: $PUBLISHABLE_KEY" \
--        "$SUPABASE_URL/rest/v1/plan_day_moves?select=*"
-- must return [].
--
-- Unlike `client_assignments`, the client *may* write here. Migration 0012 is
-- explicit that the plan is the trainer's and the client only reads it — this
-- table is the one thing on their side of that line: which day of their own
-- week a session lands on is theirs, what the session is is not.

alter table public.plan_day_moves enable row level security;

drop policy if exists "plan_day_moves_own"   on public.plan_day_moves;
drop policy if exists "plan_day_moves_admin" on public.plan_day_moves;

create policy "plan_day_moves_own" on public.plan_day_moves
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The trainer sees the moved schedule on the client's profile, and reads the
-- same rows to do it. Read only: rearranging somebody's week for them is a
-- conversation, not a button.
create policy "plan_day_moves_admin" on public.plan_day_moves
  for select to authenticated
  using (public.is_admin());
