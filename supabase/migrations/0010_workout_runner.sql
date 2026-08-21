-- =============================================================================
-- Fit Compas — 0010: workout runner log (feature 10)
--
-- Run once in Supabase Studio -> SQL Editor -> New query -> Run.
-- Idempotent: running it twice is safe.
--
-- Numbered by roadmap feature rather than sequentially on purpose. Several
-- features are being built in parallel against this one database, and a
-- feature number is unique where "the next free number" is not.
--
-- These two tables are hand-written SQL, not `drizzle-kit generate` output,
-- for the same reason `profiles` is: the generated file would carry whatever
-- else happened to be in src/db/schema at the moment of generation. They are
-- still declared in src/db/schema/runner.ts so Drizzle types match reality —
-- and so a later diff does not propose dropping them.
-- =============================================================================

-- ---------- enum ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workout_session_status') then
    create type public.workout_session_status as enum (
      'in_progress',
      'completed',
      'abandoned'
    );
  end if;
end
$$;

-- ---------- workout_sessions ------------------------------------------------

create table if not exists public.workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,

  -- The workout being performed, by slug. Deliberately not a foreign key yet:
  -- the `workouts` table arrives with feature 07 and the runner ships before
  -- it, against built-in demo plans. Feature 07 adds `workout_id uuid` beside
  -- this column and backfills; the text stays as the human-readable record.
  workout_ref    text not null,

  -- Copied, not joined. A workout renamed or deleted next month must not
  -- rewrite what someone actually trained in August.
  workout_title  text not null default '',

  status         public.workout_session_status not null default 'in_progress',

  started_at     timestamptz not null default now(),
  finished_at    timestamptz,

  -- Wall clock as the client measured it, including pauses. Not
  -- finished_at - started_at: a phone that locks mid-workout keeps counting.
  elapsed_sec    integer not null default 0,

  completed_sets integer not null default 0,
  total_sets     integer not null default 0,
  -- Sum of reps x weight in kilograms. Numeric, not float: this gets summed
  -- across months in the progress charts (feature 14).
  total_volume   numeric(10, 2) not null default 0,

  rpe            smallint check (rpe between 1 and 10),
  notes          text,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.workout_sessions is
  'One row per performed workout. Written by the runner (feature 10).';

create index if not exists workout_sessions_user_idx
  on public.workout_sessions (user_id, started_at desc);

-- One live session per workout per user. A double tap on Start, or the page
-- reopened in a second tab, has to resume the existing session instead of
-- opening a second one that then competes for the same set logs.
create unique index if not exists workout_sessions_active_key
  on public.workout_sessions (user_id, workout_ref)
  where status = 'in_progress';

-- ---------- set_logs --------------------------------------------------------

create table if not exists public.set_logs (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null
                   references public.workout_sessions (id) on delete cascade,

  -- Stable identity of one set inside the workout: "<section>:<item>:<round>".
  -- Built by buildTimeline(), and the reason a re-submitted set updates in
  -- place instead of piling up duplicates.
  step_key       text not null,

  exercise_id    uuid references public.exercises (id) on delete set null,
  exercise_title text not null default '',

  section        text     not null default 'main',
  round          smallint not null default 1,
  position       smallint not null default 0,

  mode           text not null default 'reps' check (mode in ('reps', 'time')),
  reps           integer,
  duration_sec   integer,
  weight         numeric(7, 2),

  -- Everything the equipment asks for beyond weight — incline, speed, level,
  -- resistance — keyed by metric_kind. jsonb because which keys exist depends
  -- on the equipment, and a column per metric would be mostly nulls.
  metrics        jsonb,

  rpe            smallint check (rpe between 1 and 10),
  skipped        boolean not null default false,

  logged_at      timestamptz not null default now()
);

comment on table public.set_logs is
  'One row per set performed or skipped. Upserted on (session_id, step_key).';

create unique index if not exists set_logs_step_key
  on public.set_logs (session_id, step_key);

create index if not exists set_logs_exercise_idx
  on public.set_logs (exercise_id);

-- ---------- updated_at ------------------------------------------------------
-- touch_updated_at() is created by 0001.

drop trigger if exists workout_sessions_touch_updated_at on public.workout_sessions;
create trigger workout_sessions_touch_updated_at
  before update on public.workout_sessions
  for each row execute function public.touch_updated_at();

-- ---------- RLS -------------------------------------------------------------
--
-- Not optional. PostgREST exposes every table in `public`, so a table without
-- RLS is readable and writable by anyone holding the publishable key — and
-- that key ships to the browser by design. Training history is the most
-- personal data in the app.
--
-- The app itself writes through Drizzle as `postgres`, which bypasses RLS, so
-- these policies exist to lock down the PostgREST surface. Verify with:
--   curl -H "apikey: $PUBLISHABLE_KEY" \
--        "$SUPABASE_URL/rest/v1/workout_sessions?select=*"
-- which must return [].

alter table public.workout_sessions enable row level security;
alter table public.set_logs         enable row level security;

drop policy if exists "workout_sessions_own"   on public.workout_sessions;
drop policy if exists "workout_sessions_admin" on public.workout_sessions;
drop policy if exists "set_logs_own"           on public.set_logs;
drop policy if exists "set_logs_admin"         on public.set_logs;

create policy "workout_sessions_own" on public.workout_sessions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The trainer reads client history in features 12 and 14. Read only: nobody
-- edits somebody else's training log, not even the admin.
create policy "workout_sessions_admin" on public.workout_sessions
  for select to authenticated
  using (public.is_admin());

create policy "set_logs_own" on public.set_logs
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.session_id
        and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions s
      where s.id = set_logs.session_id
        and s.user_id = (select auth.uid())
    )
  );

create policy "set_logs_admin" on public.set_logs
  for select to authenticated
  using (public.is_admin());
