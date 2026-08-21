import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import type {
  NotificationAudience,
  NotificationEmailStatus,
  NotificationKind,
  NotificationMessageStatus,
  NotificationRepeat,
} from "@/db/schema/notifications";

import type { DayKey } from "./schedule";
import type { ClientOption, Inbox, InboxItem, MessageView } from "./types";

/**
 * Everything the notification screens read.
 *
 * Two rules the rest of the repo already follows and this file keeps.
 *
 * **Reads are defensive about tables that may not be there.** Migration 0015 is
 * applied by hand in the Supabase SQL editor, so between a deploy and that
 * click the tables do not exist. The screens say so — an inbox that renders
 * "unavailable" is a state somebody can act on, a 500 is not.
 *
 * **Names are spelled out in SQL, never interpolated.** Inside a `` sql`` ``
 * template Drizzle drops the table qualifier, so `${a.userId}` renders as
 * `"user_id"` and a correlated subquery becomes `column reference is
 * ambiguous` — at runtime only, because the types match either way.
 */

const MISSING_TABLE = "42P01";

/** Drizzle wraps driver errors; the real `PostgresError` hangs off `cause`. */
function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }

  return undefined;
}

function isMissingTable(error: unknown): boolean {
  return pgErrorCode(error) === MISSING_TABLE;
}

/** Postgres hands back `09:00:00`; every input and label wants `09:00`. */
function trimSeconds(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

/**
 * A timestamp column out of `db.execute` is not reliably a `Date`.
 *
 * Drizzle only applies its column decoders to queries built through the query
 * builder; a raw `` sql`` `` statement hands back whatever the driver made of
 * it, which for a `timestamptz` is sometimes a string. Calling `.toISOString()`
 * on that throws at runtime while the type says it cannot — this screen 500'd
 * on exactly that. Feature 12 has the same helper in `lib/clients/queries.ts`
 * for the same reason; worth folding into one place once the parallel features
 * have landed.
 */
function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/* ------------------------------------------------------------------ admin */

type MessageRow = {
  id: string;
  kind: NotificationKind;
  title: Translated | null;
  body: Translated | null;
  href: string | null;
  audience: NotificationAudience;
  audience_user_id: string | null;
  audience_name: string | null;
  repeat_mode: NotificationRepeat;
  time_of_day: string | null;
  time_zone: string;
  repeat_days: number[] | null;
  starts_on: string | null;
  ends_on: string | null;
  via_email: boolean;
  status: NotificationMessageStatus;
  next_run_at: Date | string | null;
  last_run_at: Date | string | null;
  run_count: number;
  last_recipients: number;
  delivered: number;
  read_count: number;
  created_at: Date | string;
};

/**
 * The trainer's list.
 *
 * Delivered and read counts come from a lateral subquery rather than a group-by
 * over a join: a message with no deliveries has to appear with a zero, and an
 * inner join would drop exactly the messages the trainer most wants to look at.
 *
 * Ordered so anything still pending is at the top — a list of a hundred sent
 * announcements with tomorrow's reminder buried in the middle is a list nobody
 * checks.
 */
export async function listMessages(): Promise<MessageView[]> {
  try {
    const rows = await db.execute<MessageRow>(sql`
      select
        m.id::text,
        m.kind,
        m.title,
        m.body,
        m.href,
        m.audience,
        m.audience_user_id::text,
        p.full_name                          as audience_name,
        m.repeat_mode,
        m.time_of_day::text,
        m.time_zone,
        m.repeat_days,
        to_char(m.starts_on, 'YYYY-MM-DD')   as starts_on,
        to_char(m.ends_on, 'YYYY-MM-DD')     as ends_on,
        m.via_email,
        m.status,
        m.next_run_at,
        m.last_run_at,
        m.run_count,
        m.last_recipients,
        coalesce(d.delivered, 0)             as delivered,
        coalesce(d.read_count, 0)            as read_count,
        m.created_at
      from public.notification_messages m
      left join public.profiles p on p.id = m.audience_user_id
      left join lateral (
        select
          count(*)::int          as delivered,
          count(n.read_at)::int  as read_count
        from public.notifications n
        where n.message_id = m.id
      ) d on true
      order by
        (m.status = 'scheduled') desc,
        m.next_run_at asc nulls last,
        m.created_at desc
      limit 100
    `);

    return [...rows].map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title ?? {},
      body: row.body ?? {},
      href: row.href,
      audience: row.audience,
      audienceUserId: row.audience_user_id,
      audienceName: row.audience_name,
      repeat: row.repeat_mode,
      timeOfDay: trimSeconds(row.time_of_day),
      timeZone: row.time_zone,
      repeatDays: row.repeat_days ?? [],
      startsOn: (row.starts_on as DayKey | null) ?? null,
      endsOn: (row.ends_on as DayKey | null) ?? null,
      viaEmail: row.via_email,
      status: row.status,
      nextRunAt: iso(row.next_run_at),
      lastRunAt: iso(row.last_run_at),
      runCount: Number(row.run_count),
      lastRecipients: Number(row.last_recipients),
      delivered: Number(row.delivered),
      read: Number(row.read_count),
      createdAt: iso(row.created_at) ?? "",
    }));
  } catch (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
}

/**
 * Who the "one client" picker offers.
 *
 * Deliberately not `listClients()` from feature 12 — that read pulls plans,
 * activity totals and note counts across three tables to draw a roster. This
 * one fills a `<select>`.
 */
export async function listClientOptions(): Promise<ClientOption[]> {
  const rows = await db.execute<{ id: string; full_name: string | null }>(sql`
    select p.id::text, p.full_name
    from public.profiles p
    where p.role = 'client'
    order by coalesce(nullif(p.full_name, ''), 'zzz'), p.created_at
    limit 500
  `);

  return [...rows].map((row) => ({
    id: row.id,
    // A client who signed up and never filled in a name still has to be
    // pickable, so the id stands in rather than an empty option.
    name: row.full_name?.trim() || `#${row.id.slice(0, 8)}`,
  }));
}

/** Whether migration 0015 has been applied — the admin screen says so if not. */
export async function notificationsReady(): Promise<boolean> {
  try {
    await db.execute(sql`select 1 from public.notification_messages limit 1`);
    return true;
  } catch (error) {
    if (isMissingTable(error)) return false;
    throw error;
  }
}

/* ----------------------------------------------------------------- client */

type InboxRow = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  email_status: NotificationEmailStatus;
  read_at: Date | string | null;
  created_at: Date | string;
};

/** How many rows the inbox screen shows before it stops. */
const INBOX_LIMIT = 60;

export async function getInbox(userId: string): Promise<Inbox> {
  try {
    const rows = await db.execute<InboxRow>(sql`
      select
        n.id::text,
        n.kind,
        n.title,
        n.body,
        n.href,
        n.email_status,
        n.read_at,
        n.created_at
      from public.notifications n
      where n.user_id = ${userId}::uuid
      order by n.created_at desc
      limit ${INBOX_LIMIT}
    `);

    const items: InboxItem[] = [...rows].map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      href: row.href,
      emailStatus: row.email_status,
      readAt: iso(row.read_at),
      createdAt: iso(row.created_at) ?? "",
    }));

    return {
      items,
      // Counted over the whole table, not over the page: a reader with eighty
      // unread notices should see eighty, not "sixty".
      unread: await countUnread(userId),
      available: true,
    };
  } catch (error) {
    if (isMissingTable(error)) {
      return { items: [], unread: 0, available: false };
    }
    throw error;
  }
}

/**
 * The number on the bell. Runs on every page of the client app, which is why it
 * has a partial index of its own and returns 0 rather than throwing — a header
 * that can take the whole app down with it is not worth a badge.
 */
export async function countUnread(userId: string): Promise<number> {
  try {
    const rows = await db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from public.notifications
      where user_id = ${userId}::uuid and read_at is null
    `);

    return Number([...rows][0]?.count ?? 0);
  } catch {
    return 0;
  }
}
