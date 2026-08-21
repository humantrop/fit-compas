-- Enable RLS on every content table.
--
-- This is not optional on Supabase. PostgREST exposes every table in the
-- `public` schema, so a table without RLS is readable AND writable by anyone
-- holding the publishable key — which ships to the browser by design.
--
-- The app itself reads through Drizzle as the `postgres` role, which bypasses
-- RLS, so these policies exist purely to lock down the PostgREST surface.
-- Default-deny plus a narrow read grant is the right shape here.

-- ---------- taxonomy: readable by signed-in users, writable by admin --------

alter table public.equipment          enable row level security;
alter table public.muscle_groups      enable row level security;
alter table public.goals              enable row level security;
alter table public.activities         enable row level security;
alter table public.health_issues      enable row level security;
alter table public.equipment_metrics  enable row level security;

drop policy if exists "equipment_read"         on public.equipment;
drop policy if exists "equipment_admin"        on public.equipment;
drop policy if exists "muscle_groups_read"     on public.muscle_groups;
drop policy if exists "muscle_groups_admin"    on public.muscle_groups;
drop policy if exists "goals_read"             on public.goals;
drop policy if exists "goals_admin"            on public.goals;
drop policy if exists "activities_read"        on public.activities;
drop policy if exists "activities_admin"       on public.activities;
drop policy if exists "health_issues_read"     on public.health_issues;
drop policy if exists "health_issues_admin"    on public.health_issues;
drop policy if exists "equipment_metrics_read" on public.equipment_metrics;
drop policy if exists "equipment_metrics_admin" on public.equipment_metrics;

create policy "equipment_read" on public.equipment
  for select to authenticated using (is_active);
create policy "equipment_admin" on public.equipment
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "muscle_groups_read" on public.muscle_groups
  for select to authenticated using (is_active);
create policy "muscle_groups_admin" on public.muscle_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "goals_read" on public.goals
  for select to authenticated using (is_active);
create policy "goals_admin" on public.goals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "activities_read" on public.activities
  for select to authenticated using (is_active);
create policy "activities_admin" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "health_issues_read" on public.health_issues
  for select to authenticated using (is_active);
create policy "health_issues_admin" on public.health_issues
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "equipment_metrics_read" on public.equipment_metrics
  for select to authenticated using (true);
create policy "equipment_metrics_admin" on public.equipment_metrics
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- exercises: published only, and only for signed-in users ---------

alter table public.exercises              enable row level security;
alter table public.exercise_equipment     enable row level security;
alter table public.exercise_muscle_groups enable row level security;
alter table public.exercise_goals         enable row level security;
alter table public.exercise_activities    enable row level security;

drop policy if exists "exercises_read"  on public.exercises;
drop policy if exists "exercises_admin" on public.exercises;

-- Drafts stay invisible: a half-uploaded video must never reach a client.
-- Note this grants metadata only — video bytes live in a private bucket and
-- are served through short-lived signed URLs after the subscription check.
create policy "exercises_read" on public.exercises
  for select to authenticated using (is_published);
create policy "exercises_admin" on public.exercises
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exercise_equipment_read"      on public.exercise_equipment;
drop policy if exists "exercise_equipment_admin"     on public.exercise_equipment;
drop policy if exists "exercise_muscle_groups_read"  on public.exercise_muscle_groups;
drop policy if exists "exercise_muscle_groups_admin" on public.exercise_muscle_groups;
drop policy if exists "exercise_goals_read"          on public.exercise_goals;
drop policy if exists "exercise_goals_admin"         on public.exercise_goals;
drop policy if exists "exercise_activities_read"     on public.exercise_activities;
drop policy if exists "exercise_activities_admin"    on public.exercise_activities;

create policy "exercise_equipment_read" on public.exercise_equipment
  for select to authenticated using (true);
create policy "exercise_equipment_admin" on public.exercise_equipment
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "exercise_muscle_groups_read" on public.exercise_muscle_groups
  for select to authenticated using (true);
create policy "exercise_muscle_groups_admin" on public.exercise_muscle_groups
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "exercise_goals_read" on public.exercise_goals
  for select to authenticated using (true);
create policy "exercise_goals_admin" on public.exercise_goals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "exercise_activities_read" on public.exercise_activities
  for select to authenticated using (true);
create policy "exercise_activities_admin" on public.exercise_activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- video assets: admin only, no client read at all -----------------
-- Clients never query this table. Playback URLs are minted server-side after
-- the subscription check, so exposing storage paths here buys nothing and
-- leaks the bucket layout.

alter table public.video_assets enable row level security;

drop policy if exists "video_assets_admin" on public.video_assets;

create policy "video_assets_admin" on public.video_assets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
