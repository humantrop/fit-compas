CREATE TYPE "public"."set_mode" AS ENUM('reps', 'time');--> statement-breakpoint
CREATE TYPE "public"."workout_section_kind" AS ENUM('warmup', 'main', 'cooldown');--> statement-breakpoint
CREATE TABLE "workout_activities" (
	"workout_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "workout_activities_workout_id_activity_id_pk" PRIMARY KEY("workout_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "workout_goals" (
	"workout_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	CONSTRAINT "workout_goals_workout_id_goal_id_pk" PRIMARY KEY("workout_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE "workout_items" (
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
CREATE TABLE "workout_sections" (
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
CREATE TABLE "workouts" (
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
ALTER TABLE "workout_activities" ADD CONSTRAINT "workout_activities_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_activities" ADD CONSTRAINT "workout_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_goals" ADD CONSTRAINT "workout_goals_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_goals" ADD CONSTRAINT "workout_goals_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_items" ADD CONSTRAINT "workout_items_section_id_workout_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."workout_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_items" ADD CONSTRAINT "workout_items_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sections" ADD CONSTRAINT "workout_sections_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_activities_activity_idx" ON "workout_activities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "workout_goals_goal_idx" ON "workout_goals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "workout_items_section_idx" ON "workout_items" USING btree ("section_id","position");--> statement-breakpoint
CREATE INDEX "workout_items_exercise_idx" ON "workout_items" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sections_workout_idx" ON "workout_sections" USING btree ("workout_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "workouts_slug_key" ON "workouts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "workouts_published_idx" ON "workouts" USING btree ("is_published","created_at");--> statement-breakpoint
-- ---------------------------------------------------------------------------
-- RLS, in the same migration that creates the tables.
--
-- PostgREST exposes everything in `public`, and the publishable key ships to
-- the browser by design — a table that reaches production without policies is
-- readable and writable by anyone who opens devtools. The app itself reads
-- through Drizzle as `postgres` and bypasses all of this; the policies exist
-- purely to shut the PostgREST door.
-- ---------------------------------------------------------------------------

ALTER TABLE "workouts"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_sections"   ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_items"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_goals"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "workout_activities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

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
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
