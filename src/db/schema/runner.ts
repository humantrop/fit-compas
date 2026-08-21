import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { exercises } from "./exercises";

/**
 * What the runner writes down (roadmap feature 10).
 *
 * These two tables are owned by `supabase/migrations/0010_workout_runner.sql`,
 * the same arrangement `profiles` has: the SQL is hand-written so it can carry
 * its own RLS in the same migration, and the tables are declared here so the
 * queries are typed against what is actually in the database.
 *
 * Not exported from `schema/index.ts`, and the enum is not in `enums.ts`, on
 * purpose — several roadmap features are being built against this repo at the
 * same time, and a new file cannot lose an edit race that a shared file can.
 * Nothing depends on the registration: the runner imports these tables
 * directly, and `drizzle-kit` diffs its own snapshot rather than the live
 * database, so tables it has never seen are simply not its business.
 *
 * **Worth doing once the parallel features have landed:** add
 * `export * from "./runner";` to schema/index.ts so `db.query` sees these too.
 * The first generated migration after that will contain a `CREATE TABLE` for
 * both — comment it out, exactly as 0000 does for `profiles`, because they are
 * already there.
 */
export const workoutSessionStatus = pgEnum("workout_session_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),

    /**
     * The workout performed, by slug. Not a foreign key yet — `workouts`
     * arrives with feature 07 and the runner ships before it, against the
     * built-in demo plans in `lib/runner/demo-plans.ts`.
     */
    workoutRef: text("workout_ref").notNull(),

    /** Copied, not joined: renaming a workout must not rewrite past sessions. */
    workoutTitle: text("workout_title").notNull().default(""),

    status: workoutSessionStatus("status").notNull().default("in_progress"),

    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    finishedAt: timestamp("finished_at", { withTimezone: true }),

    /** Wall clock as the client measured it — a locked phone keeps counting. */
    elapsedSec: integer("elapsed_sec").notNull().default(0),

    completedSets: integer("completed_sets").notNull().default(0),
    totalSets: integer("total_sets").notNull().default(0),

    /** Sum of reps x weight in kg. Numeric because feature 14 sums it monthly. */
    totalVolume: numeric("total_volume", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),

    rpe: smallint("rpe"),
    notes: text("notes"),

    /**
     * The client ticked the day off their plan instead of running it here
     * (feature 13, column added by `supabase/migrations/0013_client_plan.sql`).
     *
     * Such a row carries zero sets, zero volume and zero seconds, because that
     * is everything that is known about it. It still lives in this table
     * rather than beside the plan: the streak, the week strip and the
     * trainer's schedule column all count sessions, and a completion recorded
     * anywhere else would be a second answer to "did I train on Tuesday".
     */
    loggedManually: boolean("logged_manually").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("workout_sessions_user_idx").on(t.userId, t.startedAt),
    // Enforced as a partial index in SQL (`where status = 'in_progress'`),
    // which Drizzle cannot express here. Declared so the diff stays quiet.
    uniqueIndex("workout_sessions_active_key").on(t.userId, t.workoutRef),
  ],
);

export const setLogs = pgTable(
  "set_logs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),

    /**
     * `<section>:<item>:<round>` — the identity of one set inside a workout,
     * built by `buildTimeline()`. Re-submitting a set updates it in place
     * instead of appending a duplicate.
     */
    stepKey: text("step_key").notNull(),

    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    exerciseTitle: text("exercise_title").notNull().default(""),

    section: text("section").notNull().default("main"),
    round: smallint("round").notNull().default(1),
    position: smallint("position").notNull().default(0),

    mode: text("mode").notNull().default("reps"),
    reps: integer("reps"),
    durationSec: integer("duration_sec"),
    weight: numeric("weight", { precision: 7, scale: 2 }),

    /** Everything past weight — incline, speed, level — keyed by metric_kind. */
    metrics: jsonb("metrics").$type<Record<string, number>>(),

    rpe: smallint("rpe"),
    skipped: boolean("skipped").notNull().default(false),

    loggedAt: timestamp("logged_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("set_logs_step_key").on(t.sessionId, t.stepKey),
    index("set_logs_exercise_idx").on(t.exerciseId),
  ],
);

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type NewWorkoutSession = typeof workoutSessions.$inferInsert;
export type SetLog = typeof setLogs.$inferSelect;
export type NewSetLog = typeof setLogs.$inferInsert;
