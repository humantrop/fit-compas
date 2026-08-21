import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { difficulty, setMode, workoutSectionKind, type metricKind } from "./enums";
import { exercises } from "./exercises";
import type { Translated } from "./i18n";
import { activities, goals } from "./taxonomy";

/** Same union as `lib/taxonomy/config`, derived here to keep the import one-way. */
type MetricKind = (typeof metricKind)["enumValues"][number];

/**
 * A session, in three levels: workout -> section -> item.
 *
 *   workout           "Upper body A"
 *     section         warm-up, then a block of 3 rounds, then a cool-down
 *       item          one exercise line: 4 x 8 @ RPE 8, 90s rest
 *
 * Rounds live on the section rather than on the item, which is what makes a
 * circuit expressible without a fourth table: three items in a section with
 * `rounds: 3` *is* a three-round circuit. A straight-sets block is the same
 * shape with `rounds: 1`.
 */

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),

    title: jsonb("title").$type<Translated>().notNull(),
    description: jsonb("description").$type<Translated>(),

    difficulty: difficulty("difficulty").notNull().default("intermediate"),

    /**
     * Recomputed from the blocks on every save rather than typed in.
     *
     * It is stored instead of derived on read because the client library and
     * the dashboard both sort and filter by it, and deriving it there would
     * mean loading every item of every workout to render a list.
     */
    estimatedDurationSec: integer("estimated_duration_sec").notNull().default(0),

    /** Drafts are invisible to clients — same rule as exercises. */
    isPublished: boolean("is_published").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("workouts_slug_key").on(t.slug),
    index("workouts_published_idx").on(t.isPublished, t.createdAt),
  ],
);

export const workoutSections = pgTable(
  "workout_sections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),

    kind: workoutSectionKind("kind").notNull().default("main"),
    /** Optional label — "Block A". Falls back to the kind in the UI. */
    title: jsonb("title").$type<Translated>(),

    position: integer("position").notNull().default(0),

    /** 1 = straight sets. Anything above turns the block into a circuit. */
    rounds: integer("rounds").notNull().default(1),

    /* The middle and outer of the three rest levels. The innermost one — rest
       between sets — sits on the item, because it belongs to the movement. */
    restBetweenRoundsSec: integer("rest_between_rounds_sec").notNull().default(60),
    restAfterSec: integer("rest_after_sec").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("workout_sections_workout_idx").on(t.workoutId, t.position)],
);

export const workoutItems = pgTable(
  "workout_items",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => workoutSections.id, { onDelete: "cascade" }),

    /**
     * `restrict`, not `cascade`: deleting an exercise that is programmed into
     * somebody's week must fail loudly rather than quietly empty the block.
     * Feature 06 retires exercises instead of deleting them for this reason.
     */
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),

    position: integer("position").notNull().default(0),

    mode: setMode("mode").notNull().default("reps"),
    sets: integer("sets").notNull().default(3),
    /** Set when mode is 'reps'. */
    reps: integer("reps"),
    /** Set when mode is 'time'. */
    durationSec: integer("duration_sec"),

    /** Innermost rest level: between sets of this one movement. */
    restSec: integer("rest_sec").notNull().default(60),

    /** 1-10, half points allowed — 7.5 is a real prescription, not a rounding. */
    rpe: numeric("rpe", { precision: 3, scale: 1, mode: "number" }),

    /** Four digits, eccentric-pause-concentric-pause: "3-1-1-0". */
    tempo: text("tempo"),

    /**
     * The numbers this line's equipment asks for, keyed by metric_kind:
     * `{ "incline": "6", "speed": "9.5" }`.
     *
     * jsonb rather than a column per metric — the set of metrics is editable
     * from the Configuration screen, so a column each would mean a migration
     * every time the admin adds one. Values are strings because they are
     * prescriptions, not measurements: "9.5", "BW+10", "max".
     */
    metrics: jsonb("metrics").$type<Partial<Record<MetricKind, string>>>(),

    /** Coaching cue for this line, shown over the video during the set. */
    note: jsonb("note").$type<Translated>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    index("workout_items_section_idx").on(t.sectionId, t.position),
    index("workout_items_exercise_idx").on(t.exerciseId),
  ],
);

/* -------------------------------------------------------------------------
   Tag joins. Same shape and same reasoning as the exercise ones: the client
   library (feature 09) filters workouts by goal and by activity, and a join
   with an index beats scanning an array column on every query.
   ------------------------------------------------------------------------- */

export const workoutGoals = pgTable(
  "workout_goals",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.workoutId, t.goalId] }),
    index("workout_goals_goal_idx").on(t.goalId),
  ],
);

export const workoutActivities = pgTable(
  "workout_activities",
  {
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.workoutId, t.activityId] }),
    index("workout_activities_activity_idx").on(t.activityId),
  ],
);

export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutSection = typeof workoutSections.$inferSelect;
export type WorkoutItem = typeof workoutItems.$inferSelect;
