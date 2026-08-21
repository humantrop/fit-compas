import type {
  NotificationAudience,
  NotificationKind,
  NotificationMessageStatus,
} from "@/db/schema/notifications";

import type { EmailCopy } from "../templates";
import type { HrefTarget, NotificationErrorCopy } from "../types";

/**
 * Feature 15 keeps its own copy instead of adding a branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Those three files are edited by every feature at once, so a shared branch is
 * the one guaranteed merge conflict in a repo where several features are being
 * built in parallel — the same reasoning as `lib/clients/copy/` and
 * `lib/library/copy/`. A typed module buys something on top of that:
 * TypeScript rejects a locale missing a key, which is stronger than
 * `npm run check:i18n`, since it fails at build time rather than when somebody
 * remembers to run the script.
 *
 * Folding this back into the main dictionaries later is a mechanical move.
 */

/** Serbian and Russian need three plural forms where English needs two. */
export type Plural = {
  one: string;
  few?: string;
  many?: string;
  other: string;
};

/** How the composer offers a schedule, which is not quite `repeat_mode`:
 *  "send it now" and "send it once, later" are the same row in the database
 *  and two different decisions on the screen. */
export type WhenChoice = "now" | "once" | "daily" | "weekly";

export type NotificationsCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;
  /** Shown when migration 0015 has not been run against this database yet. */
  setup: string;

  compose: {
    heading: string;
    kindLabel: string;
    kinds: Record<"announcement" | "reminder", string>;
    kindHint: string;

    languageHint: string;
    titleLabel: string;
    titlePlaceholder: string;
    bodyLabel: string;
    bodyPlaceholder: string;
    fallbackNote: string;

    hrefLabel: string;
    hrefHint: string;
    hrefTargets: Record<HrefTarget, string>;

    audienceLabel: string;
    audiences: Record<NotificationAudience, string>;
    audienceHint: string;
    clientLabel: string;
    clientEmpty: string;

    whenLabel: string;
    when: Record<WhenChoice, string>;
    dateLabel: string;
    timeLabel: string;
    zoneNote: string;
    weekdaysLabel: string;
    /** Monday first, seven entries, matching ISO weekday order. */
    weekdays: string[];
    startsLabel: string;
    endsLabel: string;
    endsHint: string;

    emailLabel: string;
    emailHint: string;

    previewLabel: string;
    previewNone: string;

    submitNow: string;
    submitSchedule: string;
    saving: string;
    reset: string;
  };

  list: {
    heading: string;
    empty: string;
    emptyHint: string;

    statuses: Record<NotificationMessageStatus, string>;
    audienceOne: string;

    scheduleOnce: string;
    scheduleAt: string;
    scheduleDaily: string;
    scheduleWeekly: string;

    next: string;
    lastRun: string;
    never: string;
    runs: Plural;
    delivered: Plural;
    readOf: string;
    email: string;
    emailOffLabel: string;

    sendNow: string;
    sending: string;
    pause: string;
    resume: string;
    remove: string;
    confirmRemove: string;

    checkNow: string;
    checking: string;
    sentToast: Plural;
  };

  mail: {
    heading: string;
    configured: string;
    missing: string;
    missingHint: string;
  };

  errors: NotificationErrorCopy;

  inbox: {
    metaTitle: string;
    title: string;
    subtitle: string;
    bell: string;
    empty: string;
    emptyHint: string;
    unavailable: string;
    unreadBadge: Plural;
    markAll: string;
    marking: string;
    allRead: string;
    open: string;
    unreadDot: string;
    kinds: Record<NotificationKind, string>;
  };

  email: EmailCopy;
};

/** `fill("Sent to {n} clients", { n: 12 })`. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function plural(plurals: Plural, n: number, localeTag: string): string {
  const category = new Intl.PluralRules(localeTag).select(n);

  const form =
    category === "one"
      ? plurals.one
      : category === "few"
        ? (plurals.few ?? plurals.other)
        : category === "many"
          ? (plurals.many ?? plurals.few ?? plurals.other)
          : plurals.other;

  return form.replace("{n}", new Intl.NumberFormat(localeTag).format(n));
}
