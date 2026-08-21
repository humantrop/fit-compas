import "server-only";

import { db } from "@/db/client";
import { notifications } from "@/db/schema/notifications";

import { recipientById } from "./audience";

/**
 * Notifications the app raises on its own, with no composed message behind
 * them.
 *
 * These write straight into the inbox instead of going through
 * `notification_messages`: there is no schedule to keep, no audience to
 * re-resolve, and the event that caused them has already happened. A row in the
 * schedules table for something that fires once, immediately, would show up in
 * the trainer's list of things they wrote — which they did not.
 *
 * **Nothing in here may throw.** Every caller is in the middle of doing the
 * real work — assigning a plan, finishing a session — and a notification that
 * fails must not roll that back. A client who gets their plan but not the
 * "you have a new plan" line is fine; the reverse is not.
 *
 * The text is written in all three languages up front and picked by the
 * recipient's locale, the same as a composed message.
 */

type SystemText = { sr: string; en: string; ru: string };

const PLAN_ASSIGNED: { title: SystemText; body: SystemText } = {
  title: {
    sr: "Novi plan",
    en: "A new plan",
    ru: "Новый план",
  },
  body: {
    sr: "Trener ti je dodelio novi plan — „{program}“. Raspored te čeka u Mom planu.",
    en: "Your coach assigned you a new plan — “{program}”. The schedule is waiting in My plan.",
    ru: "Тренер назначил тебе новый план — «{program}». Расписание ждёт в разделе «Мой план».",
  },
};

/**
 * "Your coach assigned you a plan."
 *
 * `programTitle` arrives already translated per locale by the caller, because
 * the program's name is jsonb on its own row and this module should not be the
 * second place that knows how to read it.
 */
export async function notifyPlanAssigned(
  userId: string,
  programTitle: Partial<Record<"sr" | "en" | "ru", string>>,
): Promise<void> {
  try {
    const person = await recipientById(userId);
    if (!person) return;

    const locale = person.locale;
    const program =
      programTitle[locale] ??
      programTitle.sr ??
      Object.values(programTitle).find(Boolean) ??
      "";

    await db.insert(notifications).values({
      userId,
      kind: "plan",
      title: PLAN_ASSIGNED.title[locale],
      body: PLAN_ASSIGNED.body[locale].replace("{program}", program),
      href: "/plan",
      locale,
      // No message row, so the unique index does not apply and the key is only
      // documentation. Assigning a plan twice is two real events.
      occurrenceKey: "once",
      emailStatus: "none",
    });
  } catch (error) {
    console.error("[notifications] plan-assigned notice failed", error);
  }
}
