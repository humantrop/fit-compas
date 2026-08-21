-- =============================================================================
-- Fit Compas — 0014: progress (feature 14)
--
-- Run once in Supabase Studio -> SQL Editor -> New query -> Run.
-- Idempotent: running it twice is safe.
--
-- Feature 14 is four things on one screen — measurements, progress photos,
-- charts, and the streak — but only two of them need storage:
--
--   1. `body_measurements` — what the tape and the scale said, one row per
--      metric per day.
--   2. `progress_photos`   — a pointer to an object in the `progress-photos`
--      bucket, which migration 0001 already created with its policies.
--
-- The other two are derived. The charts of training volume and the streak of
-- trained days are read out of `workout_sessions`, the same table the runner
-- writes and the dashboard counts — a progress screen with its own tally of
-- how much someone trained is a second answer to a question that already has
-- one, and the two would drift on exactly the weeks somebody cares about.
--
-- **Why measurements are tall and not wide.** The obvious shape is one row per
-- day with a column per body part. It reads well and it charts badly: every
-- chart, every "latest value", every delta would name its column, so the list
-- of metrics would be spelled out a dozen times across the app and adding one
-- would be a migration plus a sweep. Tall makes the metric a value, so the
-- whole screen is one loop and `lib/progress/metrics.ts` is the only place
-- that knows the list. The cost is that a metric arrives as an enum label
-- rather than a column name — which is the point: the enum is what keeps
-- junk out at the boundary.
--
-- Units are canonical in the database — kilograms, centimetres, percent — and
-- converted at the edge for a reader whose profile says imperial. A column
-- that sometimes means pounds is a column nobody can chart. Feature 16 lets
-- the reader flip `profiles.units`; it changes nothing in here.
-- =============================================================================

-- ---------- enums -----------------------------------------------------------
-- A fixed list rather than free text: a screen that charts "waist" cannot also
-- chart "Waist", "waistline" and "стомак" and still draw one line. Adding a
-- metric later is `alter type ... add value` plus an entry in
-- lib/progress/metrics.ts — the enum is the half that has to be a migration.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'body_metric') then
    create type public.body_metric as enum (
      'weight',      -- kg
      'body_fat',    -- percent
      'neck',        -- cm, and everything below it
      'shoulders',
      'chest',
      'upper_arm',
      'forearm',
      'waist',
      'hips',
      'thigh',
      'calf'
    );
  end if;

  -- Three poses, because a comparison only means something between two photos
  -- taken from the same angle. Anything else is a photo album.
  if not exists (select 1 from pg_type where typname = 'photo_pose') then
    create type public.photo_pose as enum ('front', 'side', 'back');
  end if;
end
$$;

-- ---------- measurements ----------------------------------------------------

create table if not exists public.body_measurements (
  id         uuid primary key default gen_random_uuid(),

  user_id    uuid not null references public.profiles (id) on delete cascade,

  metric     public.body_metric not null,

  -- A calendar day, not an instant. Nobody measures their waist at 14:32 —
  -- they measure it on Tuesday, and a timestamp would drag the time zone
  -- question into a value that does not have one.
  taken_on   date not null,

  -- Canonical units. numeric, not double precision: 82.4 kg has to come back
  -- as 82.4, and a float that renders as 82.39999 in a chart label is the kind
  -- of bug nobody can explain to a user.
  value      numeric(6, 2) not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Deliberately loose: the real per-metric ranges live in
  -- lib/progress/metrics.ts, where they can say "a waist between 30 and 250
  -- cm" in a sentence the reader gets to see. This one only keeps out the
  -- values that are not measurements at all.
  constraint body_measurements_value_sane check (value > 0 and value < 1000)
);

comment on table public.body_measurements is
  'One measurement, one metric, one day. Canonical units: kg, cm, percent. Feature 14.';

-- One value per metric per day. Measuring twice on the same morning is a
-- correction, not a second data point — so a re-entry overwrites (the action
-- upserts on this key) and the chart never has to pick between two points
-- sitting on the same x.
create unique index if not exists body_measurements_day_key
  on public.body_measurements (user_id, metric, taken_on);

-- The shape every read has: one metric, ordered by day. The chart, the latest
-- value and the delta are all this index.
create index if not exists body_measurements_series_idx
  on public.body_measurements (user_id, metric, taken_on desc);

drop trigger if exists body_measurements_touch_updated_at on public.body_measurements;
create trigger body_measurements_touch_updated_at
  before update on public.body_measurements
  for each row execute function public.touch_updated_at();

-- ---------- progress photos -------------------------------------------------
--
-- The bytes are already provided for: migration 0001 created the
-- `progress-photos` bucket (private, 10 MB, images only) with policies keyed
-- on `progress-photos/{user_id}/…`. This table is the index over it, so the
-- gallery is one query instead of a listing call per render, and so a photo
-- can carry the two facts the object cannot: which day it is of, and which
-- way the person was facing.

create table if not exists public.progress_photos (
  id           uuid primary key default gen_random_uuid(),

  user_id      uuid not null references public.profiles (id) on delete cascade,

  taken_on     date not null,
  pose         public.photo_pose not null,

  -- Object key inside the `progress-photos` bucket, always
  -- `{user_id}/…` — that prefix is what the storage policies match on.
  storage_path text not null,

  width        integer,
  height       integer,
  size_bytes   integer,
  mime_type    text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.progress_photos is
  'Index over the progress-photos bucket. One photo per pose per day. Feature 14.';

-- One photo per pose per day, for the same reason measurements are unique per
-- day: the comparison view puts "front, 1 June" beside "front, 1 September"
-- and has to be able to name one photo for each. Uploading a second front shot
-- on the same day replaces the first, and the action deletes the object that
-- was there so the bucket does not accumulate rows nothing points at.
create unique index if not exists progress_photos_slot_key
  on public.progress_photos (user_id, taken_on, pose);

create index if not exists progress_photos_recent_idx
  on public.progress_photos (user_id, taken_on desc);

drop trigger if exists progress_photos_touch_updated_at on public.progress_photos;
create trigger progress_photos_touch_updated_at
  before update on public.progress_photos
  for each row execute function public.touch_updated_at();

-- ---------- RLS -------------------------------------------------------------
--
-- Verify before pushing:
--   curl -H "apikey: $PUBLISHABLE_KEY" \
--        "$SUPABASE_URL/rest/v1/body_measurements?select=*"
--   curl -H "apikey: $PUBLISHABLE_KEY" \
--        "$SUPABASE_URL/rest/v1/progress_photos?select=*"
-- Both must return [].
--
-- These are the client's own numbers about their own body, and the split is
-- the same one the storage policies in 0001 already made for the bucket: the
-- owner writes, the trainer reads. A coach who could edit a client's weight
-- history could quietly rewrite the one record the client keeps to check
-- themselves against, and nothing about coaching needs that.
--
-- Note this is the mirror image of `client_notes` (migration 0012), which the
-- subject may not read at all. Both rules point the same way: the person the
-- data is *about* is not automatically the person it belongs to, and each
-- table says out loud which one it is.

alter table public.body_measurements enable row level security;
alter table public.progress_photos   enable row level security;

drop policy if exists "body_measurements_own"   on public.body_measurements;
drop policy if exists "body_measurements_admin" on public.body_measurements;
drop policy if exists "progress_photos_own"     on public.progress_photos;
drop policy if exists "progress_photos_admin"   on public.progress_photos;

create policy "body_measurements_own" on public.body_measurements
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "body_measurements_admin" on public.body_measurements
  for select to authenticated
  using (public.is_admin());

create policy "progress_photos_own" on public.progress_photos
  for all to authenticated
  using      ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "progress_photos_admin" on public.progress_photos
  for select to authenticated
  using (public.is_admin());
