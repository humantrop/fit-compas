import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { metricKind } from "./enums";
import type { Translated } from "./i18n";

/**
 * The tag vocabularies behind every filter in the library — MyFitWorld's
 * "Configuration" section. The admin edits these; they are not hardcoded,
 * because the useful set differs per coach.
 *
 * `slug` is the stable identifier used in URLs and seed data. `name` carries
 * the translations. Renaming an item in the UI must never change the slug, or
 * every saved filter breaks.
 */

const base = {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull(),
  name: jsonb("name").$type<Translated>().notNull(),
  /** Sort order in pickers. Ties fall back to slug. */
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
};

export const equipment = pgTable(
  "equipment",
  base,
  (t) => [uniqueIndex("equipment_slug_key").on(t.slug)],
);

export const muscleGroups = pgTable(
  "muscle_groups",
  {
    ...base,
    /**
     * Self-reference for "Back -> Lats". Kept one level deep by convention:
     * deeper trees make the filter UI unusable without buying anything.
     */
    parentId: uuid("parent_id"),
  },
  (t) => [uniqueIndex("muscle_groups_slug_key").on(t.slug)],
);

export const goals = pgTable(
  "goals",
  base,
  (t) => [uniqueIndex("goals_slug_key").on(t.slug)],
);

/** Training modality: strength, mobility, HIIT, pilates, rehab. */
export const activities = pgTable(
  "activities",
  base,
  (t) => [uniqueIndex("activities_slug_key").on(t.slug)],
);

/** Conditions a coach programs around: lower back pain, knee injury. */
export const healthIssues = pgTable(
  "health_issues",
  base,
  (t) => [uniqueIndex("health_issues_slug_key").on(t.slug)],
);

/**
 * Which numeric inputs a piece of equipment asks for in the workout builder.
 *
 * This is what stops the builder from showing the same generic reps/weight
 * pair for a treadmill and a barbell. A treadmill row declares incline, speed,
 * pace and distance; a barbell declares weight.
 */
export const equipmentMetrics = pgTable(
  "equipment_metrics",
  {
    equipmentId: uuid("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
    metric: metricKind("metric").notNull(),
    position: integer("position").notNull().default(0),
    /** Suggested default shown in the builder, e.g. 0 incline. */
    defaultValue: text("default_value"),
  },
  (t) => [
    primaryKey({ columns: [t.equipmentId, t.metric] }),
  ],
);

export type Equipment = typeof equipment.$inferSelect;
export type MuscleGroup = typeof muscleGroups.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type HealthIssue = typeof healthIssues.$inferSelect;
export type EquipmentMetric = typeof equipmentMetrics.$inferSelect;

/** Every taxonomy shares one shape, so one admin screen edits all of them. */
export const taxonomyTables = {
  equipment,
  muscle_groups: muscleGroups,
  goals,
  activities,
  health_issues: healthIssues,
} as const;

export type TaxonomyKey = keyof typeof taxonomyTables;
