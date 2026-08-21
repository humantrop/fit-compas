import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";

/**
 * Progress: measurements and photos (roadmap feature 14).
 *
 * Owned by `supabase/migrations/0014_progress.sql` — hand-written so the two
 * tables carry their RLS in the migration that creates them, the same
 * arrangement `runner.ts`, `clients.ts` and `plan.ts` have, and declared here
 * so the queries are typed against what is actually in the database.
 *
 * The two enums are declared in this file rather than in `enums.ts` for the
 * same reason the tables are not registered in `schema/index.ts`: while several
 * roadmap features are being built against this repo at once, a new file cannot
 * lose an edit race that a shared one can. Nothing depends on either
 * registration — `lib/progress/queries.ts` imports these directly.
 *
 * **Worth doing once the parallel features have landed:** move `bodyMetric` and
 * `photoPose` into `enums.ts`, add `export * from "./progress";` to
 * schema/index.ts, and comment out the `CREATE TABLE`/`CREATE TYPE` in the
 * first generated migration after that — exactly as 0000 does for `profiles`,
 * because they are already there.
 */

/**
 * Which body measurement a row holds.
 *
 * The list is duplicated in `lib/progress/metrics.ts`, which adds the unit, the
 * plausible range and the display order. That module is the one the screen
 * reads; this one only has to match the database. They are checked against each
 * other by `METRIC_ORDER` being typed as `BodyMetric[]` — dropping a value here
 * without dropping it there fails the build.
 */
export const bodyMetric = pgEnum("body_metric", [
  "weight",
  "body_fat",
  "neck",
  "shoulders",
  "chest",
  "upper_arm",
  "forearm",
  "waist",
  "hips",
  "thigh",
  "calf",
]);

export type BodyMetric = (typeof bodyMetric.enumValues)[number];

/** Front, side, back — a comparison is only meaningful within one of them. */
export const photoPose = pgEnum("photo_pose", ["front", "side", "back"]);

export type PhotoPose = (typeof photoPose.enumValues)[number];

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    metric: bodyMetric("metric").notNull(),

    /**
     * `mode: "string"` for the same reason `plan_day_moves.from_day` uses it:
     * everything downstream is calendar arithmetic on `YYYY-MM-DD` keys, and a
     * `Date` would drag the time-of-day question back into a value that has no
     * time of day.
     */
    takenOn: date("taken_on", { mode: "string" }).notNull(),

    /**
     * Canonical units — kilograms, centimetres, percent.
     *
     * `mode: "number"` because these are body measurements with two decimals,
     * comfortably inside what a double can hold exactly enough to chart. The
     * column stays `numeric` so the value that comes back is the value that
     * went in, rather than 82.39999999.
     */
    value: numeric("value", { precision: 6, scale: 2, mode: "number" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // A second measurement on the same day is a correction, not a data point.
    uniqueIndex("body_measurements_day_key").on(t.userId, t.metric, t.takenOn),
    index("body_measurements_series_idx").on(t.userId, t.metric, t.takenOn),
  ],
);

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;

/**
 * The index over the `progress-photos` bucket.
 *
 * The bucket itself, and the policies that scope it to
 * `progress-photos/{user_id}/…`, came with migration 0001 — long before there
 * was a screen for it. This table is what makes a gallery one query instead of
 * a storage listing per render, and it is where the two facts an object cannot
 * carry live: the day the photo is of, and which way the person was facing.
 */
export const progressPhotos = pgTable(
  "progress_photos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    takenOn: date("taken_on", { mode: "string" }).notNull(),
    pose: photoPose("pose").notNull(),

    /** Object key inside the bucket. Always prefixed with the owner's id. */
    storagePath: text("storage_path").notNull(),

    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    mimeType: text("mime_type"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // One photo per pose per day: the comparison view has to be able to name
    // one photo for each end of "front, June" against "front, September".
    uniqueIndex("progress_photos_slot_key").on(t.userId, t.takenOn, t.pose),
    index("progress_photos_recent_idx").on(t.userId, t.takenOn),
  ],
);

export type ProgressPhoto = typeof progressPhotos.$inferSelect;
export type NewProgressPhoto = typeof progressPhotos.$inferInsert;
