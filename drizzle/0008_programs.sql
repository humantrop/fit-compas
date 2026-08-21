-- Feature 08 — programs: weeks x days -> workouts, with rest days.
--
-- Numbered 0008 rather than 0002 because features 05-08 are being built in
-- parallel sessions against the same tree. Reserving the feature number for
-- the migration keeps two sessions from both writing 0002_*.sql. The journal
-- applies entries in array order, not by file name, so the gap is harmless.
--
-- Written to be re-runnable: every statement is guarded. The workouts foreign
-- key at the bottom attaches itself only once feature 07 has created that
-- table, so this file can be applied now and applied again afterwards.

CREATE TABLE IF NOT EXISTS "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"difficulty" "difficulty" DEFAULT 'intermediate' NOT NULL,
	"days_per_week" integer DEFAULT 7 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"label" jsonb,
	"note" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_rest" boolean DEFAULT false NOT NULL,
	"workout_id" uuid,
	"note" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_goals" (
	"program_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	CONSTRAINT "program_goals_program_id_goal_id_pk" PRIMARY KEY("program_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_activities" (
	"program_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "program_activities_program_id_activity_id_pk" PRIMARY KEY("program_id","activity_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_weeks" ADD CONSTRAINT "program_weeks_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_days" ADD CONSTRAINT "program_days_week_id_program_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."program_weeks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_goals" ADD CONSTRAINT "program_goals_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_goals" ADD CONSTRAINT "program_goals_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_activities" ADD CONSTRAINT "program_activities_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "program_activities" ADD CONSTRAINT "program_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "programs_slug_key" ON "programs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "programs_published_idx" ON "programs" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "program_weeks_program_position_key" ON "program_weeks" USING btree ("program_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "program_days_week_position_key" ON "program_days" USING btree ("week_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_days_workout_idx" ON "program_days" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_goals_goal_idx" ON "program_goals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "program_activities_activity_idx" ON "program_activities" USING btree ("activity_id");--> statement-breakpoint

-- ---------- RLS, in the same migration that creates the tables -------------
--
-- Not optional on Supabase: PostgREST publishes every table in `public`, so a
-- table without policies is readable and writable by anyone holding the
-- publishable key — and that key ships to the browser by design.

alter table public.programs           enable row level security;--> statement-breakpoint
alter table public.program_weeks      enable row level security;--> statement-breakpoint
alter table public.program_days       enable row level security;--> statement-breakpoint
alter table public.program_goals      enable row level security;--> statement-breakpoint
alter table public.program_activities enable row level security;--> statement-breakpoint

drop policy if exists "programs_read"            on public.programs;--> statement-breakpoint
drop policy if exists "programs_admin"           on public.programs;--> statement-breakpoint
drop policy if exists "program_weeks_read"       on public.program_weeks;--> statement-breakpoint
drop policy if exists "program_weeks_admin"      on public.program_weeks;--> statement-breakpoint
drop policy if exists "program_days_read"        on public.program_days;--> statement-breakpoint
drop policy if exists "program_days_admin"       on public.program_days;--> statement-breakpoint
drop policy if exists "program_goals_read"       on public.program_goals;--> statement-breakpoint
drop policy if exists "program_goals_admin"      on public.program_goals;--> statement-breakpoint
drop policy if exists "program_activities_read"  on public.program_activities;--> statement-breakpoint
drop policy if exists "program_activities_admin" on public.program_activities;--> statement-breakpoint

-- A draft program is a work in progress — half its weeks are empty. It stays
-- invisible until it is published, same rule as a draft exercise.
create policy "programs_read" on public.programs
  for select to authenticated using (is_published);--> statement-breakpoint
create policy "programs_admin" on public.programs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());--> statement-breakpoint

-- Weeks and days inherit visibility from their program. Without the exists()
-- the schedule of an unpublished program would be readable on its own.
create policy "program_weeks_read" on public.program_weeks
  for select to authenticated using (
    exists (
      select 1 from public.programs p
      where p.id = program_weeks.program_id and p.is_published
    )
  );--> statement-breakpoint
create policy "program_weeks_admin" on public.program_weeks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());--> statement-breakpoint

create policy "program_days_read" on public.program_days
  for select to authenticated using (
    exists (
      select 1
      from public.program_weeks w
      join public.programs p on p.id = w.program_id
      where w.id = program_days.week_id and p.is_published
    )
  );--> statement-breakpoint
create policy "program_days_admin" on public.program_days
  for all to authenticated using (public.is_admin()) with check (public.is_admin());--> statement-breakpoint

create policy "program_goals_read" on public.program_goals
  for select to authenticated using (true);--> statement-breakpoint
create policy "program_goals_admin" on public.program_goals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());--> statement-breakpoint

create policy "program_activities_read" on public.program_activities
  for select to authenticated using (true);--> statement-breakpoint
create policy "program_activities_admin" on public.program_activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());--> statement-breakpoint

-- ---------- the seam to feature 07 -----------------------------------------
--
-- `program_days.workout_id` points at public.workouts, which feature 07
-- creates. That feature is being built in a parallel session, so this file
-- must apply whether or not the table is there yet: it attaches the foreign
-- key if it finds one, and does nothing if it does not.
--
-- Re-run this migration (it is idempotent) once feature 07 has landed, or let
-- 07's own migration add the constraint. Until then the column is a plain uuid
-- and nothing in the app dereferences an id the workouts table cannot resolve —
-- see src/lib/programs/workout-source.ts.
--
-- ON DELETE restrict, not set null: a workout that programs depend on must not
-- disappear out from under them and quietly leave empty days. Retire it
-- instead, the way taxonomy items are retired.
DO $$ BEGIN
  IF to_regclass('public.workouts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'program_days_workout_id_workouts_id_fk'
     )
  THEN
    ALTER TABLE "program_days"
      ADD CONSTRAINT "program_days_workout_id_workouts_id_fk"
      FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;
