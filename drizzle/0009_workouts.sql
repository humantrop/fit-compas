-- Feature 07 — workouts: workout -> section -> item, plus the two tag joins.
--
-- Numbered 0009 rather than 0007 on purpose. 07 was built in a parallel
-- session and merged after 08, and drizzle-kit picks the next free number from
-- the snapshot chain — renaming the file would leave `meta/0009_snapshot.json`
-- ahead of it and the next `db:generate` would diff against the wrong base.
-- The journal decides the order, not the name.
--
-- Written to be re-runnable, like 0008: the tables already exist on the shared
-- development database from when this branch applied its own earlier numbering,
-- so every statement here is guarded.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'set_mode') THEN
    CREATE TYPE "public"."set_mode" AS ENUM('reps', 'time');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workout_section_kind') THEN
    CREATE TYPE "public"."workout_section_kind" AS ENUM('warmup', 'main', 'cooldown');
  END IF;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"difficulty" "difficulty" DEFAULT 'intermediate' NOT NULL,
	"estimated_duration_sec" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_id" uuid NOT NULL,
	"kind" "workout_section_kind" DEFAULT 'main' NOT NULL,
	"title" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"rounds" integer DEFAULT 1 NOT NULL,
	"rest_between_rounds_sec" integer DEFAULT 60 NOT NULL,
	"rest_after_sec" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"mode" "set_mode" DEFAULT 'reps' NOT NULL,
	"sets" integer DEFAULT 3 NOT NULL,
	"reps" integer,
	"duration_sec" integer,
	"rest_sec" integer DEFAULT 60 NOT NULL,
	"rpe" numeric(3, 1),
	"tempo" text,
	"metrics" jsonb,
	"note" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_goals" (
	"workout_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	CONSTRAINT "workout_goals_workout_id_goal_id_pk" PRIMARY KEY("workout_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workout_activities" (
	"workout_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "workout_activities_workout_id_activity_id_pk" PRIMARY KEY("workout_id","activity_id")
);
--> statement-breakpoint

/* ---------------------------------------------------------- foreign keys */

DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('workout_sections',   'workout_sections_workout_id_workouts_id_fk',        'workout_id',  'workouts',         'cascade'),
      ('workout_items',      'workout_items_section_id_workout_sections_id_fk',   'section_id',  'workout_sections', 'cascade'),
      -- restrict, not cascade: deleting an exercise that is programmed into
      -- somebody's week must fail loudly, not quietly empty the block.
      ('workout_items',      'workout_items_exercise_id_exercises_id_fk',         'exercise_id', 'exercises',        'restrict'),
      ('workout_goals',      'workout_goals_workout_id_workouts_id_fk',           'workout_id',  'workouts',         'cascade'),
      ('workout_goals',      'workout_goals_goal_id_goals_id_fk',                 'goal_id',     'goals',            'cascade'),
      ('workout_activities', 'workout_activities_workout_id_workouts_id_fk',      'workout_id',  'workouts',         'cascade'),
      ('workout_activities', 'workout_activities_activity_id_activities_id_fk',   'activity_id', 'activities',       'cascade')
    ) AS t(child, name, col, parent, on_delete)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.name) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I(id) ON DELETE %s',
        fk.child, fk.name, fk.col, fk.parent, fk.on_delete
      );
    END IF;
  END LOOP;
END $$;--> statement-breakpoint

/* -------------------------------------------------------------- indexes */

CREATE UNIQUE INDEX IF NOT EXISTS "workouts_slug_key" ON "workouts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workouts_published_idx" ON "workouts" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_sections_workout_idx" ON "workout_sections" USING btree ("workout_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_items_section_idx" ON "workout_items" USING btree ("section_id","position");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_items_exercise_idx" ON "workout_items" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_goals_goal_idx" ON "workout_goals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workout_activities_activity_idx" ON "workout_activities" USING btree ("activity_id");--> statement-breakpoint

/* ------------------------------------------------------------------ RLS */
-- In the same migration that creates the tables, per the rule in the roadmap.
--
-- PostgREST exposes everything in `public`, and the publishable key ships to
-- the browser by design — a table that reaches production without policies is
-- readable and writable by anyone who opens devtools. The app itself reads
-- through Drizzle as `postgres` and bypasses all of this; the policies exist
-- purely to shut the PostgREST door.

ALTER TABLE "workouts"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sections"   ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_items"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_goals"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "workouts_read"            ON "workouts";--> statement-breakpoint
DROP POLICY IF EXISTS "workouts_admin"           ON "workouts";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_sections_read"    ON "workout_sections";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_sections_admin"   ON "workout_sections";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_items_read"       ON "workout_items";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_items_admin"      ON "workout_items";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_goals_read"       ON "workout_goals";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_goals_admin"      ON "workout_goals";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_activities_read"  ON "workout_activities";--> statement-breakpoint
DROP POLICY IF EXISTS "workout_activities_admin" ON "workout_activities";--> statement-breakpoint

-- A draft workout must not be visible to anyone but the admin: half-built
-- sessions are the normal state of this table while a week is being planned.
CREATE POLICY "workouts_read" ON "workouts"
  FOR SELECT TO authenticated USING (is_published);--> statement-breakpoint
CREATE POLICY "workouts_admin" ON "workouts"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint

-- Children inherit their parent's visibility. Without the subquery a client
-- could read the structure of every unpublished session by listing sections.
CREATE POLICY "workout_sections_read" ON "workout_sections"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_sections.workout_id AND w.is_published
    )
  );--> statement-breakpoint
CREATE POLICY "workout_sections_admin" ON "workout_sections"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint

CREATE POLICY "workout_items_read" ON "workout_items"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workout_sections s
      JOIN public.workouts w ON w.id = s.workout_id
      WHERE s.id = workout_items.section_id AND w.is_published
    )
  );--> statement-breakpoint
CREATE POLICY "workout_items_admin" ON "workout_items"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint

CREATE POLICY "workout_goals_read" ON "workout_goals"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_goals.workout_id AND w.is_published
    )
  );--> statement-breakpoint
CREATE POLICY "workout_goals_admin" ON "workout_goals"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint

CREATE POLICY "workout_activities_read" ON "workout_activities"
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_activities.workout_id AND w.is_published
    )
  );--> statement-breakpoint
CREATE POLICY "workout_activities_admin" ON "workout_activities"
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());--> statement-breakpoint

/* ------------------------------------------- the foreign key 08 left open */
-- 0008_programs adds `program_days.workout_id -> workouts.id` only if the
-- workouts table happens to exist when it runs, which it did not: 08 shipped
-- first. On a fresh database this migration runs after it, and on the shared
-- one 08 has already been applied — either way this is the run that can
-- finally create it. Same guard, same ON DELETE restrict: a workout a program
-- depends on must not disappear from under it.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'program_days_workout_id_workouts_id_fk'
  ) AND to_regclass('public.program_days') IS NOT NULL THEN
    ALTER TABLE "program_days"
      ADD CONSTRAINT "program_days_workout_id_workouts_id_fk"
      FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id")
      ON DELETE restrict;
  END IF;
END $$;
