import type { Translated } from "@/db/schema/i18n";
import type {
  NotificationAudience,
  NotificationEmailStatus,
  NotificationKind,
  NotificationMessageStatus,
  NotificationRepeat,
} from "@/db/schema/notifications";

import type { DayKey } from "./schedule";

/**
 * Shared contract for the notification screens.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export
 * async functions — a constant in there is a build error, which this repo has
 * already hit once. Actions return an error *code*, never a sentence, so the
 * component maps it through the feature's copy module and each reader gets
 * their own language.
 */

export type NotificationErrorCode =
  | "not_admin"
  | "not_found"
  | "title_required"
  | "body_too_long"
  | "invalid_time"
  | "invalid_date"
  | "no_weekdays"
  | "recipient_missing"
  | "past_date"
  | "unknown";

export type NotificationState = {
  status: "idle" | "error" | "saved" | "sent";
  code?: NotificationErrorCode;
  /** How many inbox rows the send produced. Only set on `sent`. */
  recipients?: number;
};

export const NOTIFICATION_IDLE: NotificationState = { status: "idle" };

export type NotificationErrorCopy = Record<NotificationErrorCode, string>;

export const TITLE_MAX = 120;
export const BODY_MAX = 1000;

/**
 * Where a notification may point.
 *
 * A closed list rather than a free-text path. The value is stored without the
 * language segment and prefixed at render, so one message reaches a Serbian and
 * an English reader without a second row — and a typo cannot produce a
 * notification whose only action is a 404. Adding a destination is one entry
 * here plus one key in the copy module.
 */
export const HREF_TARGETS = [
  "",
  "/dashboard",
  "/plan",
  "/workout",
  "/library",
  "/progress",
] as const;

export type HrefTarget = (typeof HREF_TARGETS)[number];

export function isHrefTarget(value: unknown): value is HrefTarget {
  return (HREF_TARGETS as readonly unknown[]).includes(value);
}

/** How long "gone quiet" is, for the `idle` audience. Days. */
export const IDLE_AFTER_DAYS = 14;

/* ------------------------------------------------------------------ views */

/**
 * One entry in the "one client" picker.
 *
 * Declared here rather than in `queries.ts` because the composer is a client
 * component: `queries.ts` opens with `import "server-only"`, and a value import
 * from it would drag the database client into the browser bundle. A type import
 * is erased, but the rule this repo learned the hard way is that constants and
 * types belong in a file the browser is allowed to reach.
 */
export type ClientOption = {
  id: string;
  name: string;
};

/** One row of the trainer's message list. */
export type MessageView = {
  id: string;
  kind: NotificationKind;
  title: Translated;
  body: Translated;
  href: string | null;

  audience: NotificationAudience;
  audienceUserId: string | null;
  /** Filled in for `one`, so the list can name the person. */
  audienceName: string | null;

  repeat: NotificationRepeat;
  /** `HH:MM`, already trimmed of the seconds Postgres returns. */
  timeOfDay: string | null;
  timeZone: string;
  repeatDays: number[];
  startsOn: DayKey | null;
  endsOn: DayKey | null;

  viaEmail: boolean;
  status: NotificationMessageStatus;

  nextRunAt: string | null;
  lastRunAt: string | null;
  runCount: number;
  lastRecipients: number;

  /** Total inbox rows this message has ever produced, and how many were read. */
  delivered: number;
  read: number;

  createdAt: string;
};

/** One row of a client's inbox. */
export type InboxItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Locale-less app path; the reader's language is prefixed at render. */
  href: string | null;
  emailStatus: NotificationEmailStatus;
  readAt: string | null;
  createdAt: string;
};

export type Inbox = {
  items: InboxItem[];
  unread: number;
  /** False when the tables are unreachable — the screen says so rather than
   *  pretending the inbox is empty. */
  available: boolean;
};

/** What one dispatch pass did, for the cron route's response and the log. */
export type DispatchReport = {
  messages: number;
  delivered: number;
  emailsSent: number;
  emailsFailed: number;
};

export const EMPTY_REPORT: DispatchReport = {
  messages: 0,
  delivered: 0,
  emailsSent: 0,
  emailsFailed: 0,
};
