"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import {
  notificationMessages,
  notifications,
  type NotificationAudience,
  type NotificationKind,
} from "@/db/schema/notifications";
import { getProfile } from "@/lib/auth/session";
import { getAdminTimeZone } from "@/lib/clients/queries";
import { isValidDayKey, type DayKey } from "@/lib/clients/schedule";
import { isLocale, locales } from "@/lib/i18n/config";

import { dispatchAll, runNow } from "./dispatch";
import {
  formatTimeOfDay,
  instantAt,
  nextRun,
  parseTimeOfDay,
  type Repeat,
  type ScheduleSpec,
} from "./schedule";
import {
  BODY_MAX,
  isHrefTarget,
  TITLE_MAX,
  type NotificationErrorCode,
  type NotificationState,
} from "./types";

/**
 * Every mutation on the notification screens.
 *
 * Server Actions are reachable by a direct POST, not only through our UI, so
 * the role check belongs in every one of them. Drizzle connects as `postgres`
 * and bypasses RLS — the policies in migration 0015 protect the tables from
 * PostgREST, not from this file. The two client-facing actions check ownership
 * instead: marking somebody else's notification as read is a small thing to be
 * able to do, and there is no reason to be able to do it.
 */

function fail(code: NotificationErrorCode): NotificationState {
  return { status: "error", code };
}

const SAVED: NotificationState = { status: "saved" };

async function requireAdminId(): Promise<string | null> {
  const profile = await getProfile();
  return profile?.role === "admin" ? profile.id : null;
}

const uuidSchema = z.string().uuid();

function readId(formData: FormData, field: string): string | null {
  const parsed = uuidSchema.safeParse(formData.get(field));
  return parsed.success ? parsed.data : null;
}

function readDay(formData: FormData, field: string): DayKey | null {
  const value = formData.get(field);
  return isValidDayKey(value) ? value : null;
}

/* --------------------------------------------------------------- compose */

const KINDS: NotificationKind[] = ["announcement", "reminder"];
const AUDIENCES: NotificationAudience[] = [
  "all",
  "active_plan",
  "no_plan",
  "idle",
  "one",
];
const WHEN = ["now", "once", "daily", "weekly"] as const;
type When = (typeof WHEN)[number];

/**
 * Collects `title_sr` / `title_en` / `title_ru` into one jsonb value.
 *
 * Empty locales are dropped rather than stored as `""`. `translate()` falls
 * back through Serbian for anything missing, and a stored empty string would
 * beat that fallback and deliver a blank line to the reader who happened to be
 * set to English.
 */
function readTranslated(formData: FormData, prefix: string, max: number): Translated {
  const value: Translated = {};

  for (const locale of locales) {
    const text = String(formData.get(`${prefix}_${locale}`) ?? "")
      .trim()
      .slice(0, max);
    if (text) value[locale] = text;
  }

  return value;
}

function readWeekdays(formData: FormData): number[] {
  const days = formData
    .getAll("days")
    .map((value) => Number(value))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7);

  return [...new Set(days)].sort((a, b) => a - b);
}

export async function createMessageAction(
  _prev: NotificationState,
  formData: FormData,
): Promise<NotificationState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const kindValue = String(formData.get("kind") ?? "announcement");
  const kind = (KINDS as string[]).includes(kindValue)
    ? (kindValue as NotificationKind)
    : "announcement";

  const title = readTranslated(formData, "title", TITLE_MAX);
  // Serbian is the source text everywhere in this app, and it is what every
  // other locale falls back to. A message without it has no guaranteed reading.
  if (!title.sr) return fail("title_required");

  const bodyRaw = String(formData.get("body_sr") ?? "");
  if (bodyRaw.length > BODY_MAX) return fail("body_too_long");
  const body = readTranslated(formData, "body", BODY_MAX);

  const hrefValue = String(formData.get("href") ?? "");
  const href = isHrefTarget(hrefValue) && hrefValue ? hrefValue : null;

  const audienceValue = String(formData.get("audience") ?? "all");
  const audience = (AUDIENCES as string[]).includes(audienceValue)
    ? (audienceValue as NotificationAudience)
    : "all";

  const audienceUserId = audience === "one" ? readId(formData, "clientId") : null;
  if (audience === "one" && !audienceUserId) return fail("recipient_missing");

  const whenValue = String(formData.get("when") ?? "now");
  const when: When = (WHEN as readonly string[]).includes(whenValue)
    ? (whenValue as When)
    : "now";

  const timeZone = await getAdminTimeZone();
  const now = new Date();

  const minutes = parseTimeOfDay(formData.get("time"));
  const days = readWeekdays(formData);
  const startsOn = readDay(formData, "startsOn");
  const endsOn = readDay(formData, "endsOn");

  if (endsOn && startsOn && endsOn < startsOn) return fail("invalid_date");

  let repeat: Repeat = "once";
  let firstRun: Date | null = now;

  if (when === "once") {
    const day = readDay(formData, "date");
    if (!day) return fail("invalid_date");
    if (minutes === null) return fail("invalid_time");

    firstRun = instantAt(day, minutes, timeZone);
    // A one-off in the past would fire on the very next tick, which is not
    // "later" — it is "now, but surprising".
    if (firstRun.getTime() <= now.getTime()) return fail("past_date");
  } else if (when === "daily" || when === "weekly") {
    if (minutes === null) return fail("invalid_time");
    if (when === "weekly" && days.length === 0) return fail("no_weekdays");

    repeat = when;

    const spec: ScheduleSpec = {
      repeat,
      minutes,
      timeZone,
      days,
      startsOn,
      endsOn,
      at: null,
    };

    firstRun = nextRun(spec, now);
    // A window that has already closed, or weekdays that never come round
    // before `ends_on`. Better to refuse than to save a schedule that silently
    // never fires.
    if (!firstRun) return fail("invalid_date");
  }

  const viaEmail = formData.get("viaEmail") === "on";

  try {
    const [created] = await db
      .insert(notificationMessages)
      .values({
        authorId: adminId,
        kind,
        title,
        body,
        href,
        audience,
        audienceUserId,
        repeatMode: repeat,
        // Stored for every repeat and for a one-off alike: the list shows
        // "at 09:00" either way, and re-deriving it from `next_run_at` would
        // print the wrong hour once the clocks change.
        timeOfDay: minutes === null ? null : formatTimeOfDay(minutes),
        timeZone,
        repeatDays: repeat === "weekly" ? days : [],
        startsOn: repeat === "once" ? null : startsOn,
        endsOn: repeat === "once" ? null : endsOn,
        viaEmail,
        status: "scheduled",
        nextRunAt: firstRun,
      })
      .returning({ id: notificationMessages.id });

    if (!created) return fail("unknown");

    if (when === "now") {
      // Fired inline rather than left to the next tick. The trainer pressed
      // Send; a message that appears somewhere between now and an hour from now
      // is not what that button promises.
      const recipients = await runNow(created.id);
      refresh();
      return { status: "sent", recipients };
    }

    refresh();
    return SAVED;
  } catch (error) {
    console.error("[notifications] create failed", error);
    return fail("unknown");
  }
}

/* ---------------------------------------------------------------- manage */

export async function sendMessageNowAction(
  _prev: NotificationState,
  formData: FormData,
): Promise<NotificationState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const id = readId(formData, "messageId");
  if (!id) return fail("not_found");

  try {
    const recipients = await runNow(id);
    refresh();
    return { status: "sent", recipients };
  } catch (error) {
    console.error("[notifications] send-now failed", error);
    return fail("unknown");
  }
}

/**
 * Pause and resume, in one action.
 *
 * Pausing keeps `next_run_at` where it is, so resuming a daily reminder in the
 * afternoon does not fire the morning it slept through — `nextRun` is
 * recomputed from now, and the missed occurrence stays missed. A paused
 * reminder that catches up on resume is a notification storm.
 */
export async function toggleMessageAction(
  _prev: NotificationState,
  formData: FormData,
): Promise<NotificationState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const id = readId(formData, "messageId");
  if (!id) return fail("not_found");

  try {
    const [message] = await db
      .select()
      .from(notificationMessages)
      .where(eq(notificationMessages.id, id))
      .limit(1);

    if (!message) return fail("not_found");

    if (message.status === "paused") {
      const following = nextRun(
        {
          repeat: message.repeatMode,
          minutes: parseTimeOfDay(message.timeOfDay),
          timeZone: message.timeZone,
          days: message.repeatDays ?? [],
          startsOn: message.startsOn,
          endsOn: message.endsOn,
          at: message.nextRunAt,
        },
        new Date(),
      );

      await db
        .update(notificationMessages)
        .set({
          status: following ? "scheduled" : "sent",
          nextRunAt: following,
        })
        .where(eq(notificationMessages.id, id));
    } else {
      await db
        .update(notificationMessages)
        .set({ status: "paused" })
        .where(eq(notificationMessages.id, id));
    }

    refresh();
    return SAVED;
  } catch (error) {
    console.error("[notifications] toggle failed", error);
    return fail("unknown");
  }
}

/**
 * Deletes the schedule, not the deliveries.
 *
 * `notifications.message_id` is `on delete set null`, so what already reached
 * somebody stays in their inbox. Removing a mistyped weekly reminder must not
 * reach into eleven people's phones and un-send the four copies they have
 * already read.
 */
export async function deleteMessageAction(
  _prev: NotificationState,
  formData: FormData,
): Promise<NotificationState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const id = readId(formData, "messageId");
  if (!id) return fail("not_found");

  try {
    await db.delete(notificationMessages).where(eq(notificationMessages.id, id));
    refresh();
    return SAVED;
  } catch (error) {
    console.error("[notifications] delete failed", error);
    return fail("unknown");
  }
}

/**
 * Runs a dispatch pass by hand.
 *
 * Exists because the cron cadence is a deployment detail the trainer cannot
 * see. On a Hobby plan Vercel fires the job once a day, and without this button
 * "I scheduled it for 14:00 and nothing happened" has no answer on the screen.
 */
export async function checkScheduleAction(): Promise<NotificationState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  try {
    const report = await dispatchAll();
    refresh();
    return { status: "sent", recipients: report.delivered };
  } catch (error) {
    console.error("[notifications] manual dispatch failed", error);
    return fail("unknown");
  }
}

/* ----------------------------------------------------------------- inbox */

/**
 * Opens one notification: marks it read, then goes where it points.
 *
 * A form and a server-side redirect rather than a link plus a background fetch.
 * The row has one job and this way it works before any JavaScript loads, which
 * on a gym floor with two bars of signal is not a hypothetical.
 */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const profile = await getProfile();
  const id = readId(formData, "notificationId");

  const langValue = String(formData.get("lang") ?? "sr");
  const lang = isLocale(langValue) ? langValue : "sr";

  let target: string | null = null;

  if (profile && id) {
    try {
      const [row] = await db
        .update(notifications)
        .set({ readAt: sql`now()` })
        .where(
          and(
            eq(notifications.id, id),
            // Ownership, not just identity: the id is in a form field and a
            // form field is whatever the sender says it is.
            eq(notifications.userId, profile.id),
          ),
        )
        .returning({ href: notifications.href });

      target = row?.href ?? null;
    } catch (error) {
      console.error("[notifications] open failed", error);
    }
  }

  // The href is read back from the row rather than taken from the form, so a
  // crafted POST cannot turn a notification into an open redirect.
  if (target) redirect(`/${lang}${target}`);

  refresh();
}

export async function markAllReadAction(): Promise<void> {
  const profile = await getProfile();
  if (!profile) return;

  try {
    await db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(
        and(eq(notifications.userId, profile.id), isNull(notifications.readAt)),
      );
  } catch (error) {
    console.error("[notifications] mark-all-read failed", error);
  }

  refresh();
}
