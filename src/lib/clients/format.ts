import { daysBetween, toDate, type DayKey } from "./schedule";

/**
 * Formatting for the People screens. Pure, so the same call renders on the
 * server and again in a client component without drifting.
 *
 * Every formatter takes the BCP 47 tag rather than the app's two-letter locale:
 * bare `sr-RS` resolves to Cyrillic in ICU, and this UI is Latin throughout.
 * Callers pass `localeTags[locale]` from `lib/i18n/config`.
 */

export function formatDay(day: DayKey, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(toDate(day));
}

export function formatDayLong(day: DayKey, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDate(day));
}

/** Just the number, for the square in a schedule strip. */
export function formatDayNumber(day: DayKey, localeTag: string): string {
  return new Intl.NumberFormat(localeTag).format(Number(day.slice(-2)));
}

export function formatWeekday(day: DayKey, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    weekday: "short",
    timeZone: "UTC",
  }).format(toDate(day));
}

/**
 * "yesterday", "in 4 days", "3 weeks ago".
 *
 * `Intl.RelativeTimeFormat` rather than a hand-rolled table: Serbian and
 * Russian both inflect the unit by the number, and getting that wrong is the
 * kind of thing that makes an app read as translated.
 */
export function formatRelativeDay(
  day: DayKey,
  today: DayKey,
  localeTag: string,
): string {
  const delta = daysBetween(today, day);
  const rtf = new Intl.RelativeTimeFormat(localeTag, { numeric: "auto" });

  if (Math.abs(delta) < 7) return rtf.format(delta, "day");
  if (Math.abs(delta) < 31) return rtf.format(Math.trunc(delta / 7), "week");
  return rtf.format(Math.trunc(delta / 30), "month");
}

/** An instant, in the zone the screen is counting days in. */
export function formatMoment(
  value: string | null,
  localeTag: string,
  timeZone: string,
): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${total}s`;
}

/** Kilograms, thinned out: 12 480 kg reads better as 12.5 t. */
export function formatVolume(kg: number, localeTag: string): string {
  if (kg >= 1000) {
    return `${new Intl.NumberFormat(localeTag, {
      maximumFractionDigits: 1,
    }).format(kg / 1000)} t`;
  }

  return `${new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
  }).format(kg)} kg`;
}

export function formatNumber(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag).format(value);
}

/** Falls back to the email, then to a dash — a row must always have a label. */
export function displayName(
  fullName: string | null,
  email: string | null,
): string {
  const name = fullName?.trim();
  if (name) return name;
  return email?.trim() || "—";
}

/** Two letters for the avatar circle. */
export function initials(fullName: string | null, email: string | null): string {
  const source = fullName?.trim() || email?.trim() || "";
  if (!source) return "?";

  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? "");

  return letters.join("").toUpperCase() || source[0].toUpperCase();
}
