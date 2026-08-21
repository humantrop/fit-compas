import { sql } from "drizzle-orm";
import {
  date,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { clientAssignments } from "./clients";
import { profiles } from "./profiles";

/**
 * The client's side of their own plan (roadmap feature 13).
 *
 * Owned by `supabase/migrations/0013_client_plan.sql` — hand-written so the
 * table carries its RLS in the migration that creates it, the same arrangement
 * `runner.ts` and `clients.ts` have, and declared here so the queries are typed
 * against what is actually in the database.
 *
 * There is only one table because there is only one thing to store. The
 * calendar itself stays derived from `client_assignments.start_date` and the
 * program grid (see `lib/clients/schedule.ts`); this is the sparse list of
 * exceptions to it. A client who never moves a day costs zero rows, and a
 * program the trainer edits still reaches everyone, because nothing was
 * copied out of it.
 *
 * Not exported from `schema/index.ts` while several roadmap features are being
 * built against this repo at once — a new file cannot lose an edit race that a
 * shared file can. Nothing depends on the registration: `lib/plan/queries.ts`
 * imports the table directly.
 *
 * **Worth doing once the parallel features have landed:** add
 * `export * from "./plan";` to schema/index.ts, and comment out the
 * `CREATE TABLE` in the first generated migration after that — exactly as 0000
 * does for `profiles`, because the table is already there.
 */
export const planDayMoves = pgTable(
  "plan_day_moves",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => clientAssignments.id, { onDelete: "cascade" }),

    /** Denormalised from the assignment so RLS is a column comparison. */
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    /**
     * `mode: "string"` for the same reason `client_assignments.start_date`
     * uses it: everything downstream is calendar arithmetic on `YYYY-MM-DD`
     * keys, and a `Date` would drag the time-of-day question back in.
     */
    fromDay: date("from_day", { mode: "string" }).notNull(),
    toDay: date("to_day", { mode: "string" }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // Both ends unique — that is what keeps the overlay a one-to-one mapping
    // and saves it from needing a tie-break nobody can see.
    uniqueIndex("plan_day_moves_from_key").on(t.assignmentId, t.fromDay),
    uniqueIndex("plan_day_moves_to_key").on(t.assignmentId, t.toDay),
    index("plan_day_moves_user_idx").on(t.userId, t.toDay),
  ],
);

export type PlanDayMove = typeof planDayMoves.$inferSelect;
export type NewPlanDayMove = typeof planDayMoves.$inferInsert;
