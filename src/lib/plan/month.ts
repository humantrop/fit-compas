import { weekdayIndex } from "@/lib/dashboard/days";
import { shiftDay, toDate, type DayKey } from "@/lib/clients/schedule";

/**
 * The month the calendar is showing, as a `YYYY-MM` string in the query.
 *
 * Which month is on screen is navigation state, so it lives in the URL rather
 * than in component state — the same rule the library and the exercise list
 * follow. A month someone is looking at is a link they can send, and Back
 * means something.
 *
 * Pure, no server imports: the grid renders on the server and the day cells
 * are links, so nothing here has to cross the boundary — but keeping it pure
 * means it can if a later screen needs it.
 */

/** `YYYY-MM`. */
export type MonthKey = string;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;

  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

export function monthOf(day: DayKey): MonthKey {
  return day.slice(0, 7);
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5)) - 1 + delta;

  return `${year + Math.floor(index / 12)}-${pad(((index % 12) + 12) % 12 + 1)}`;
}

/** The first day of the month. */
export function monthStart(month: MonthKey): DayKey {
  return `${month}-01`;
}

/**
 * The last day of the month.
 *
 * Day zero of the *next* month, which is how you avoid a leap-year table.
 */
export function monthEnd(month: MonthKey): DayKey {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5));
  const date = new Date(Date.UTC(year, index, 0));

  return `${month}-${pad(date.getUTCDate())}`;
}

/**
 * The range the grid actually draws: whole weeks, Monday to Sunday, so the
 * month sits inside a rectangle instead of a ragged one.
 */
export function monthGridRange(month: MonthKey): { from: DayKey; to: DayKey } {
  const first = monthStart(month);
  const last = monthEnd(month);

  return {
    from: shiftDay(first, -weekdayIndex(first)),
    to: shiftDay(last, 6 - weekdayIndex(last)),
  };
}

/** "August 2026", in the reader's language. */
export function monthLabel(month: MonthKey, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toDate(monthStart(month)));
}
