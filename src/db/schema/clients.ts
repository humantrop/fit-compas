import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { profiles } from "./profiles";
import { programs } from "./programs";

/**
 * The coach's side of the relationship (roadmap feature 12).
 *
 * Owned by `supabase/migrations/0012_clients.sql`, the same arrangement
 * `runner.ts` has: the SQL is hand-written so both tables carry their RLS in
 * the migration that creates them, and they are declared here so the queries
 * are typed against what is actually in the database.
 *
 * Not exported from `schema/index.ts` while several roadmap features are being
 * built against this repo at once — a new file cannot lose an edit race that a
 * shared file can. Nothing depends on the registration: the queries import
 * these tables directly, and `drizzle-kit` diffs its own snapshot rather than
 * the live database.
 *
 * **Worth doing once the parallel features have landed:** add
 * `export * from "./clients";` to schema/index.ts. The first generated
 * migration after that will contain a `CREATE TABLE` for both — comment it
 * out, exactly as 0000 does for `profiles`, because they are already there.
 */
export const assignmentStatus = pgEnum("assignment_status", [
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const clientAssignments = pgTable(
  "client_assignments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),

    status: assignmentStatus("status").notNull().default("active"),

    /**
     * The calendar day week 1 / day 1 falls on, as `YYYY-MM-DD`.
     *
     * `mode: "string"` on purpose: everything downstream is calendar
     * arithmetic on day keys, and handing it a `Date` would reintroduce the
     * time-of-day and time-zone questions the whole schedule is built to
     * avoid.
     */
    startDate: date("start_date", { mode: "string" }).notNull(),

    /** Set while paused. Resuming shifts `startDate` by the paused span. */
    pausedOn: date("paused_on", { mode: "string" }),
    endedOn: date("ended_on", { mode: "string" }),

    /** Trainer-only, like `clientNotes`. Never rendered on a client screen. */
    note: text("note"),

    assignedBy: uuid("assigned_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // Enforced as a partial index in SQL (`where status in ('active','paused')`),
    // which Drizzle cannot express here. Declared so the diff stays quiet.
    uniqueIndex("client_assignments_one_live").on(t.userId),
    index("client_assignments_program_idx").on(t.programId),
  ],
);

export const clientNotes = pgTable(
  "client_notes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    authorId: uuid("author_id"),

    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [index("client_notes_user_idx").on(t.userId, t.createdAt)],
);

export type ClientAssignment = typeof clientAssignments.$inferSelect;
export type NewClientAssignment = typeof clientAssignments.$inferInsert;
export type ClientNote = typeof clientNotes.$inferSelect;
export type AssignmentStatus = (typeof assignmentStatus.enumValues)[number];
