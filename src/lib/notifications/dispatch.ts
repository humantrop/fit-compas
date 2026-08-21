import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { translate } from "@/db/schema/i18n";
import {
  notificationMessages,
  notifications,
  type NotificationMessage,
} from "@/db/schema/notifications";
import { getNotificationsCopy } from "@/lib/notifications/copy";
import { getSiteUrl } from "@/lib/site-url";

import { resolveAudience, type Recipient } from "./audience";
import { getMailer, isMailConfigured } from "./mail";
import {
  nextRun,
  occurrenceKey,
  parseTimeOfDay,
  type ScheduleSpec,
} from "./schedule";
import { renderNotificationEmail } from "./templates";
import { EMPTY_REPORT, type DispatchReport } from "./types";

/**
 * The dispatcher: what turns a schedule into somebody's inbox.
 *
 * Two independent passes, and keeping them independent is the point.
 *
 *   `materializeDue()` advances schedules and writes inbox rows. Cheap, safe to
 *   run from anywhere, and the only thing a client actually waits on.
 *
 *   `flushEmailQueue()` takes rows already written and mails them. Slow, talks
 *   to a third party, and allowed to fail without taking the notification with
 *   it.
 *
 * They are split because they have different callers. The cron route runs both.
 * A page render runs only the first — a client opening the app should see the
 * notification their coach scheduled for 09:00 even on a deployment whose cron
 * fires once a day, but no page load should ever block on an SMTP round trip.
 * The email then goes out on the next tick, which is the right way round: late
 * mail is a nuisance, a slow app is the product.
 *
 * **Every write here is idempotent.** Deliveries insert against the unique
 * index on `(message_id, user_id, occurrence_key)`, and the schedule advance is
 * a compare-and-swap on `run_count`. A cron retry, a "send now" click and two
 * simultaneous page loads can all run this at once; the worst outcome is
 * repeated work, never a doubled notification.
 */

/** Per pass. A backlog drains over several ticks rather than in one long request. */
const MESSAGES_PER_RUN = 20;
const EMAILS_PER_RUN = 40;

function specOf(message: NotificationMessage): ScheduleSpec {
  return {
    repeat: message.repeatMode,
    minutes: parseTimeOfDay(message.timeOfDay),
    timeZone: message.timeZone,
    days: message.repeatDays ?? [],
    startsOn: message.startsOn,
    endsOn: message.endsOn,
    // For a one-off, the instant it is scheduled for *is* `next_run_at`. Which
    // is why `nextRun` hands back null once it has fired: nothing is strictly
    // after it.
    at: message.nextRunAt,
  };
}

/* ------------------------------------------------------------- deliveries */

/**
 * Writes one occurrence into every recipient's inbox and reports how many rows
 * that occurrence now has.
 *
 * The count is read back rather than taken from the insert. Under a race the
 * losing dispatcher inserts nothing and would otherwise record "reached 0
 * clients" over a send that reached everybody.
 */
async function deliver(
  message: NotificationMessage,
  recipients: Recipient[],
  key: string,
): Promise<number> {
  if (recipients.length === 0) return 0;

  const wantsEmail = message.viaEmail && isMailConfigured();

  await db
    .insert(notifications)
    .values(
      recipients.map((person) => ({
        userId: person.id,
        messageId: message.id,
        kind: message.kind,
        // Resolved here and frozen. `translate()` falls back through the
        // reader's locale, then Serbian, then whatever is set — so a message
        // the trainer only wrote in one language still arrives.
        title: translate(message.title, person.locale),
        body: translate(message.body, person.locale),
        href: message.href,
        locale: person.locale,
        occurrenceKey: key,
        // Queued only when there is a transport to drain it. Marking a row
        // queued with no mailer configured would build a backlog that never
        // moves and reads, in the admin, as mail that is on its way.
        emailStatus: wantsEmail ? ("queued" as const) : ("none" as const),
      })),
    )
    .onConflictDoNothing();

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.messageId, message.id),
        eq(notifications.occurrenceKey, key),
      ),
    );

  return Number(row?.count ?? 0);
}

/**
 * Fires one message that is due, then moves its cursor.
 *
 * The advance is a compare-and-swap: it only lands if `run_count` still holds
 * the value this run read. A second dispatcher that got there first has already
 * incremented it, so this update matches nothing and the occurrence is not
 * counted twice. Same guarantee `git update-ref` gives, for the same reason.
 *
 * **The comparison is on `run_count`, not on `next_run_at`, and that is not a
 * style choice.** Postgres stores `timestamptz` to the microsecond and a JS
 * `Date` only holds milliseconds, so the value Drizzle reads back is a
 * *truncated* copy of what is in the row: `now()` writes 23:40:17.853106 and
 * comes back as 23:40:17.853. Comparing it to the column matches nothing, ever.
 * The first version of this did exactly that — deliveries landed, the cursor
 * never moved, and every tick re-ran the same message forever while reporting
 * that it had reached nobody. An integer round-trips exactly.
 */
async function runOccurrence(message: NotificationMessage): Promise<number> {
  const firedAt = message.nextRunAt;
  if (!firedAt) return 0;

  const spec = specOf(message);
  const key = occurrenceKey(spec, firedAt);

  const recipients = await resolveAudience(
    message.audience,
    message.audienceUserId,
  );

  const delivered = await deliver(message, recipients, key);

  const following = nextRun(spec, firedAt);

  const claimed = await db
    .update(notificationMessages)
    .set({
      nextRunAt: following,
      lastRunAt: firedAt,
      runCount: sql`${notificationMessages.runCount} + 1`,
      lastRecipients: delivered,
      // A repeat with nothing left ahead of it is finished, not scheduled —
      // otherwise the list would show "next: never" forever under a status
      // that promises otherwise.
      status: following ? "scheduled" : "sent",
    })
    .where(
      and(
        eq(notificationMessages.id, message.id),
        eq(notificationMessages.runCount, message.runCount),
      ),
    )
    .returning({ id: notificationMessages.id });

  return claimed.length > 0 ? delivered : 0;
}

/**
 * Everything whose time has come.
 *
 * Ordered by `next_run_at` so a backlog drains oldest-first and a message that
 * has been waiting since Monday is not overtaken by one scheduled this morning.
 */
export async function materializeDue(): Promise<{
  messages: number;
  delivered: number;
}> {
  const due = await db
    .select()
    .from(notificationMessages)
    .where(
      and(
        eq(notificationMessages.status, "scheduled"),
        sql`${notificationMessages.nextRunAt} is not null`,
        sql`${notificationMessages.nextRunAt} <= now()`,
      ),
    )
    .orderBy(notificationMessages.nextRunAt)
    .limit(MESSAGES_PER_RUN);

  let messages = 0;
  let delivered = 0;

  for (const message of due) {
    // One failing message must not strand the ones behind it in the queue.
    try {
      const count = await runOccurrence(message);
      messages += 1;
      delivered += count;
    } catch (error) {
      console.error(
        `[notifications] message ${message.id} failed to dispatch`,
        error,
      );
    }
  }

  return { messages, delivered };
}

/* ------------------------------------------------------------------ email */

type QueuedRow = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  locale: string | null;
  email: string | null;
};

/**
 * Sends the queued rows.
 *
 * The address is joined in at send time rather than copied onto the delivery:
 * a client who fixed a typo in their email between the notification being
 * written and the mail going out should get it at the address they now use.
 * `left join`, so a row whose account has since vanished is marked failed
 * instead of sitting in the queue forever.
 */
export async function flushEmailQueue(): Promise<{
  sent: number;
  failed: number;
}> {
  const mailer = getMailer();
  if (!mailer) return { sent: 0, failed: 0 };

  const rows = await db.execute<QueuedRow>(sql`
    select n.id::text, n.title, n.body, n.href, n.locale, u.email
    from public.notifications n
    left join auth.users u on u.id = n.user_id
    where n.email_status = 'queued'
    order by n.created_at
    limit ${EMAILS_PER_RUN}
  `);

  const queued = [...rows];
  if (queued.length === 0) return { sent: 0, failed: 0 };

  // Resolved once per pass, not once per message — it reads request headers.
  let siteUrl = "https://fit-compas.vercel.app";
  try {
    siteUrl = await getSiteUrl();
  } catch {
    // Called outside a request scope. The fallback is only used for the link
    // inside the mail, and a wrong-but-live origin beats not sending.
  }

  let sent = 0;
  let failed = 0;

  for (const row of queued) {
    if (!row.email) {
      await markEmail(row.id, "failed", "no address on file");
      failed += 1;
      continue;
    }

    const locale =
      row.locale === "en" || row.locale === "ru" ? row.locale : "sr";

    const result = await mailer.send(
      renderNotificationEmail({
        title: row.title,
        body: row.body,
        href: row.href,
        locale,
        siteUrl,
        copy: getNotificationsCopy(locale).email,
        to: row.email,
      }),
    );

    if (result.ok) {
      await markEmail(row.id, "sent", null);
      sent += 1;
    } else {
      // Terminal, not retried. A transport that rejected the message once will
      // reject it again, and a queue that retries forever turns one bad address
      // into an endless outbound loop. The reason is on the row for the admin
      // screen to show.
      await markEmail(row.id, "failed", result.error);
      failed += 1;
    }
  }

  return { sent, failed };
}

async function markEmail(
  id: string,
  status: "sent" | "failed",
  error: string | null,
): Promise<void> {
  await db
    .update(notifications)
    .set({
      emailStatus: status,
      emailError: error?.slice(0, 500) ?? null,
      emailSentAt: status === "sent" ? new Date() : null,
    })
    .where(eq(notifications.id, id));
}

/* ------------------------------------------------------------------- runs */

/** The cron tick: schedules first, then the mail they produced. */
export async function dispatchAll(): Promise<DispatchReport> {
  const { messages, delivered } = await materializeDue();
  const { sent, failed } = await flushEmailQueue();

  return { messages, delivered, emailsSent: sent, emailsFailed: failed };
}

/**
 * The cheap half, for a page render.
 *
 * Swallows its own failures: this runs on the way to painting somebody's
 * dashboard, and a dispatcher problem must degrade to "no new notifications
 * yet", never to a broken screen.
 */
export async function catchUp(): Promise<DispatchReport> {
  try {
    const { messages, delivered } = await materializeDue();
    return { ...EMPTY_REPORT, messages, delivered };
  } catch (error) {
    console.error("[notifications] catch-up failed", error);
    return EMPTY_REPORT;
  }
}

/**
 * Send one message immediately, whatever its schedule says.
 *
 * Used by the "send now" button, and by composing with When = now. It fires the
 * *current* occurrence by pulling `next_run_at` back to this instant, so the
 * ordinary path does the work and there is no second copy of the delivery logic
 * that could drift from it.
 */
export async function runNow(messageId: string): Promise<number> {
  const [message] = await db
    .update(notificationMessages)
    .set({ nextRunAt: new Date(), status: "scheduled" })
    .where(eq(notificationMessages.id, messageId))
    .returning();

  if (!message) return 0;

  return runOccurrence(message);
}
