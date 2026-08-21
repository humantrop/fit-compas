DO $$ BEGIN
  CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'novice', 'intermediate', 'advanced', 'elite');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."metric_kind" AS ENUM('weight', 'incline', 'speed', 'pace', 'distance', 'power', 'level', 'height', 'resistance');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."unit_system" AS ENUM('metric', 'imperial');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('admin', 'client');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."video_provider" AS ENUM('supabase', 'mux', 'bunny', 'youtube');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."video_status" AS ENUM('uploading', 'processing', 'ready', 'errored');
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_activities" (
	"exercise_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	CONSTRAINT "exercise_activities_exercise_id_activity_id_pk" PRIMARY KEY("exercise_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_equipment" (
	"exercise_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	CONSTRAINT "exercise_equipment_exercise_id_equipment_id_pk" PRIMARY KEY("exercise_id","equipment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_goals" (
	"exercise_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	CONSTRAINT "exercise_goals_exercise_id_goal_id_pk" PRIMARY KEY("exercise_id","goal_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercise_muscle_groups" (
	"exercise_id" uuid NOT NULL,
	"muscle_group_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "exercise_muscle_groups_exercise_id_muscle_group_id_pk" PRIMARY KEY("exercise_id","muscle_group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb,
	"cues" jsonb,
	"video_asset_id" uuid,
	"difficulty" "difficulty" DEFAULT 'intermediate' NOT NULL,
	"default_mode" text DEFAULT 'reps' NOT NULL,
	"is_unilateral" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "video_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "video_provider" DEFAULT 'supabase' NOT NULL,
	"status" "video_status" DEFAULT 'uploading' NOT NULL,
	"bucket" text,
	"storage_path" text,
	"playback_id" text,
	"thumbnail_path" text,
	"duration_sec" integer,
	"width" integer,
	"height" integer,
	"size_bytes" bigint,
	"mime_type" text,
	"meta" jsonb,
	"error_message" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- profiles is created by supabase/migrations/0001_profiles_and_storage.sql,
-- where it also gets its FK to auth.users and its RLS policies. Recreating
-- it here would drop that. Declared in Drizzle for types only.
-- CREATE TABLE "profiles" (
-- 	"id" uuid PRIMARY KEY NOT NULL,
-- 	"role" "user_role" DEFAULT 'client' NOT NULL,
-- 	"full_name" text,
-- 	"avatar_url" text,
-- 	"locale" text,
-- 	"units" "unit_system" DEFAULT 'metric' NOT NULL,
-- 	"onboarded_at" timestamp with time zone,
-- 	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
-- 	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
-- );
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "equipment_metrics" (
	"equipment_id" uuid NOT NULL,
	"metric" "metric_kind" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"default_value" text,
	CONSTRAINT "equipment_metrics_equipment_id_metric_pk" PRIMARY KEY("equipment_id","metric")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "muscle_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"parent_id" uuid
);
--> statement-breakpoint
ALTER TABLE "exercise_activities" ADD CONSTRAINT "exercise_activities_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_activities" ADD CONSTRAINT "exercise_activities_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_equipment" ADD CONSTRAINT "exercise_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_goals" ADD CONSTRAINT "exercise_goals_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_goals" ADD CONSTRAINT "exercise_goals_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_muscle_group_id_muscle_groups_id_fk" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_video_asset_id_video_assets_id_fk" FOREIGN KEY ("video_asset_id") REFERENCES "public"."video_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_metrics" ADD CONSTRAINT "equipment_metrics_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exercise_activities_activity_idx" ON "exercise_activities" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "exercise_equipment_equipment_idx" ON "exercise_equipment" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "exercise_goals_goal_idx" ON "exercise_goals" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "exercise_muscle_groups_muscle_idx" ON "exercise_muscle_groups" USING btree ("muscle_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exercises_slug_key" ON "exercises" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "exercises_published_idx" ON "exercises" USING btree ("is_published","created_at");--> statement-breakpoint
CREATE INDEX "video_assets_status_idx" ON "video_assets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_slug_key" ON "activities" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_slug_key" ON "equipment" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_slug_key" ON "goals" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "health_issues_slug_key" ON "health_issues" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "muscle_groups_slug_key" ON "muscle_groups" USING btree ("slug");