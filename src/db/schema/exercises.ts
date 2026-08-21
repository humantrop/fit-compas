import { sql } from "drizzle-orm";
import {
  boolean,
  index,
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
import { videoAssets } from "./media";
import { activities, equipment, goals, muscleGroups } from "./taxonomy";

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull(),

    title: jsonb("title").$type<Translated>().notNull(),
    description: jsonb("description").$type<Translated>(),
    /** Short cues shown over the player during a set: "elbows tucked". */
    cues: jsonb("cues").$type<Translated>(),

    videoAssetId: uuid("video_asset_id").references(() => videoAssets.id, {
      onDelete: "set null",
    }),

    difficulty: difficulty("difficulty").notNull().default("intermediate"),

    /**
     * Whether the movement is measured in reps or in time by default. The
     * workout builder pre-selects this, and the coach can still override per
     * workout — a plank is time, a squat is reps.
     */
    defaultMode: text("default_mode").notNull().default("reps"),

    /** Unilateral movements need doubling when estimating session length. */
    isUnilateral: boolean("is_unilateral").notNull().default(false),

    /**
     * Draft exercises are invisible to clients. Publishing is deliberate so a
     * half-uploaded video never shows up in someone's workout.
     */
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
    uniqueIndex("exercises_slug_key").on(t.slug),
    // The library list is "published, newest first" on every load.
    index("exercises_published_idx").on(t.isPublished, t.createdAt),
  ],
);

/* -------------------------------------------------------------------------
   Tag joins.

   Many-to-many rather than an array column: the library filters by tag and a
   join with an index beats scanning an array on every query. It also keeps a
   renamed tag from needing a rewrite of every exercise row.
   ------------------------------------------------------------------------- */

export const exerciseEquipment = pgTable(
  "exercise_equipment",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.equipmentId] }),
    index("exercise_equipment_equipment_idx").on(t.equipmentId),
  ],
);

export const exerciseMuscleGroups = pgTable(
  "exercise_muscle_groups",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscleGroupId: uuid("muscle_group_id")
      .notNull()
      .references(() => muscleGroups.id, { onDelete: "cascade" }),
    /** Primary movers rank above stabilisers in the exercise detail view. */
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.muscleGroupId] }),
    index("exercise_muscle_groups_muscle_idx").on(t.muscleGroupId),
  ],
);

export const exerciseGoals = pgTable(
  "exercise_goals",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.goalId] }),
    index("exercise_goals_goal_idx").on(t.goalId),
  ],
);

export const exerciseActivities = pgTable(
  "exercise_activities",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => activities.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.activityId] }),
    index("exercise_activities_activity_idx").on(t.activityId),
  ],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
