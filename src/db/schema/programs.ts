import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { difficulty } from "./enums";
import type { Translated } from "./i18n";
import { activities, goals } from "./taxonomy";

/**
 * Multi-week programs: weeks x days -> workouts, with rest days.
 *
 * A program owns its weeks and a week owns exactly `days_per_week` day slots.
 * The slots are materialised on insert rather than left sparse — the editor is
 * a grid, and a grid with holes needs a second code path for "this cell has no
 * row yet". Cheap too: a 12-week program is 84 narrow rows.
 */

export const programs = pgTable(
  "programs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),

    title: jsonb("title").$type<Translated>().notNull(),
    description: jsonb("description").$type<Translated>(),

    difficulty: difficulty("difficulty").notNull().default("intermediate"),

    /**
     * How wide a week is in this program. Seven is the calendar week and the
     * default; a coach running a rolling 5-day block sets 5 and the grid
     * follows. Changing it later only ever adds or removes trailing slots.
     */
    daysPerWeek: integer("days_per_week").notNull().default(7),

    /** Draft programs are invisible to clients — same rule as exercises. */
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
    uniqueIndex("programs_slug_key").on(t.slug),
    index("programs_published_idx").on(t.isPublished, t.createdAt),
  ],
);

export const programWeeks = pgTable(
  "program_weeks",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),

    /** Zero-based. Dense: reordering renumbers the whole list. */
    position: integer("position").notNull().default(0),

    /** Optional name for the block — "Deload", "Peak". Falls back to "Week n". */
    label: jsonb("label").$type<Translated>(),
    note: jsonb("note").$type<Translated>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("program_weeks_program_position_key").on(t.programId, t.position),
  ],
);

export const programDays = pgTable(
  "program_days",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    weekId: uuid("week_id")
      .notNull()
      .references(() => programWeeks.id, { onDelete: "cascade" }),

    /** Zero-based index inside the week: 0 is the first training day. */
    position: integer("position").notNull().default(0),

    /**
     * A deliberate rest day, which is not the same thing as an empty slot.
     * Both have `workout_id` null; only one of them is finished.
     */
    isRest: boolean("is_rest").notNull().default(false),

    /**
     * Points at `public.workouts`, which feature 07 creates.
     *
     * Declared as a plain uuid with no Drizzle relation on purpose: this
     * feature is built alongside 07 rather than after it, and a reference to a
     * table that is not in the schema yet would not compile. The real foreign
     * key is added by the migration, which attaches it the moment the workouts
     * table exists — see drizzle/0008_programs.sql. Same shape as
     * `profiles.id`, which points at a table Drizzle must not manage either.
     *
     * One workout per day. A day that needs two sessions is rare enough that
     * modelling it would cost every other screen a nesting level.
     */
    workoutId: uuid("workout_id"),

    /** Coach note shown on the day card: "keep RPE under 7". */
    note: jsonb("note").$type<Translated>(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("program_days_week_position_key").on(t.weekId, t.position),
    // "which programs use this workout" — asked before deleting a workout.
    index("program_days_workout_idx").on(t.workoutId),
  ],
);

/* -------------------------------------------------------------------------
   Tag joins. Same reasoning as the exercise joins: the client library filters
   on these, and an indexed join beats scanning an array column per row.
   ------------------------------------------------------------------------- */

export const programGoals = pgTable(
  "program_goals",
  {
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.goalId] }),
    index("program_goals_goal_idx").on(t.goalId),
  ],
);

export const programActivities = pgTable(
  "program_activities",
  {
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.programId, t.activityId] }),
    index("program_activities_activity_idx").on(t.activityId),
  ],
);

export type Program = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type ProgramWeek = typeof programWeeks.$inferSelect;
export type ProgramDay = typeof programDays.$inferSelect;
