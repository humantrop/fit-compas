import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  date,
} from "drizzle-orm/pg-core";

import type { Translated } from "./i18n";
import { profiles } from "./profiles";

/**
 * Notifications (roadmap feature 15).
 *
 * Owned by `supabase/migrations/0015_notifications.sql`, the arrangement
 * `clients.ts` and `runner.ts` already use: the SQL is hand-written so both
 * tables carry their RLS in the migration that creates them, and they are
 * declared here so the queries are typed against what is actually in the
 * database. Read that file first — the reasoning for the two-table split, for
 * frozen text, and for email-as-a-column lives there.
 *
 * Not exported from `schema/index.ts` while several roadmap features are being
 * built against this repo at once — a new file cannot lose an edit race that a
 * shared file can. Nothing depends on the registration: the queries import
 * these tables directly, and `drizzle-kit` diffs its own snapshot rather than
 * the live database.
 *
 * **Worth doing once the parallel features have landed:** add
 * `export * from "./notifications";` to schema/index.ts. The first generated
 * migration after that will contain a `CREATE TABLE` for both — comment it
 * out, exactly as 0000 does for `profiles`, because they are already there.
 */

export const notificationKind = pgEnum("notification_kind", [
  "announcement",
  "reminder",
  "plan",
  "system",
]);

export const notificationAudience = pgEnum("notification_audience", [
  "all",
  "active_plan",
  "no_plan",
  "idle",
  "one",
]);

export const notificationRepeat = pgEnum("notification_repeat", [
  "once",
  "daily",
  "weekly",
]);

export const notificationMessageStatus = pgEnum("notification_message_status", [
  "scheduled",
  "paused",
  "sent",
  "cancelled",
]);

export const notificationEmailStatus = pgEnum("notification_email_status", [
  "none",
  "queued",
  "sent",
  "failed",
]);

export const notificationMessages = pgTable(
  "notification_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    authorId: uuid("author_id").references(() => profiles.id, {
      onDelete: "set null",
    }),

    kind: notificationKind("kind").notNull().default("announcement"),

    title: jsonb("title").$type<Translated>().notNull().default({}),
    body: jsonb("body").$type<Translated>().notNull().default({}),

    /** Locale-less app path — `/plan`, `/progress`. The `[lang]` segment is
     *  prefixed at render, so one stored value serves all three readers. */
    href: text("href"),

    audience: notificationAudience("audience").notNull().default("all"),
    audienceUserId: uuid("audience_user_id").references(() => profiles.id, {
      onDelete: "cascade",
    }),

    repeatMode: notificationRepeat("repeat_mode").notNull().default("once"),

    /** `HH:MM:SS` wall time, read in `timeZone`. */
    timeOfDay: time("time_of_day"),
    timeZone: text("time_zone").notNull().default("Europe/Belgrade"),

    /** ISO weekdays, 1 = Monday .. 7 = Sunday. Only read when weekly. */
    repeatDays: smallint("repeat_days").array().notNull().default([]),

    /**
     * `mode: "string"` for the same reason `client_assignments` does it: these
     * are calendar days, and handing them over as a `Date` puts back the
     * time-of-day and zone questions the day key exists to keep out.
     */
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),

    viaEmail: boolean("via_email").notNull().default(false),

    status: notificationMessageStatus("status").notNull().default("scheduled"),

    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    runCount: integer("run_count").notNull().default(0),
    lastRecipients: integer("last_recipients").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // Declared without the `where status = 'scheduled' and next_run_at is not
    // null` the migration puts on it — Drizzle cannot express a partial index
    // here, and this exists only so the diff stays quiet.
    index("notification_messages_due_idx").on(t.nextRunAt),
    index("notification_messages_recent_idx").on(t.createdAt),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),

    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),

    /** Null for system notifications, and for one whose message was deleted. */
    messageId: uuid("message_id").references(() => notificationMessages.id, {
      onDelete: "set null",
    }),

    kind: notificationKind("kind").notNull().default("announcement"),

    /** Already in the reader's language, and frozen there. */
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    locale: text("locale"),

    /** The occurrence's day key in the message's zone, or `once`. */
    occurrenceKey: text("occurrence_key").notNull().default("once"),

    emailStatus: notificationEmailStatus("email_status").notNull().default("none"),
    emailError: text("email_error"),
    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),

    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex("notifications_occurrence_key").on(
      t.messageId,
      t.userId,
      t.occurrenceKey,
    ),
    index("notifications_inbox_idx").on(t.userId, t.createdAt),
    index("notifications_unread_idx").on(t.userId),
  ],
);

export type NotificationMessage = typeof notificationMessages.$inferSelect;
export type NewNotificationMessage = typeof notificationMessages.$inferInsert;
export type NotificationRow = typeof notifications.$inferSelect;

export type NotificationKind = (typeof notificationKind.enumValues)[number];
export type NotificationAudience = (typeof notificationAudience.enumValues)[number];
export type NotificationRepeat = (typeof notificationRepeat.enumValues)[number];
export type NotificationMessageStatus =
  (typeof notificationMessageStatus.enumValues)[number];
export type NotificationEmailStatus =
  (typeof notificationEmailStatus.enumValues)[number];
