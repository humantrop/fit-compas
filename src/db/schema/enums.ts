import { pgEnum } from "drizzle-orm/pg-core";

/**
 * These two already exist in the database — created by
 * supabase/migrations/0001_profiles_and_storage.sql before Drizzle was
 * introduced. They are declared here so the generated types match reality.
 */
export const userRole = pgEnum("user_role", ["admin", "client"]);
export const unitSystem = pgEnum("unit_system", ["metric", "imperial"]);

/** Shown as a 1-5 scale in the UI, stored as a name so queries stay readable. */
export const difficulty = pgEnum("difficulty", [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
]);

/**
 * Where a video actually lives. Everything references video_assets rather than
 * a storage path, so moving from Supabase Storage to Mux or Bunny is a new
 * provider implementation plus a column value — not a schema migration.
 */
export const videoProvider = pgEnum("video_provider", [
  "supabase",
  "mux",
  "bunny",
  "youtube",
]);

export const videoStatus = pgEnum("video_status", [
  "uploading",
  "processing",
  "ready",
  "errored",
]);

/**
 * Which numeric inputs a piece of equipment asks for. Drives the exercise
 * builder: a treadmill shows incline/speed/pace/distance, a barbell shows
 * weight. MyFitWorld gets this right and it is worth copying.
 */
export const metricKind = pgEnum("metric_kind", [
  "weight",
  "incline",
  "speed",
  "pace",
  "distance",
  "power",
  "level",
  "height",
  "resistance",
]);

/**
 * Where a block sits in the session. Warm-up and cool-down are their own kind
 * rather than a flag on an ordinary block: the runner treats them differently
 * (no logging, no RPE prompt) and the client library shows them collapsed.
 */
export const workoutSectionKind = pgEnum("workout_section_kind", [
  "warmup",
  "main",
  "cooldown",
]);

/**
 * How one line is counted. `exercises.default_mode` proposes it; the coach
 * overrides per workout, because the same movement is reps in one session and
 * a timed hold in the next.
 */
export const setMode = pgEnum("set_mode", ["reps", "time"]);
