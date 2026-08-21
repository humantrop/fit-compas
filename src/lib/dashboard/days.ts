/**
 * Calendar arithmetic on `YYYY-MM-DD` keys, in the reader's own time zone.
 *
 * A streak is the one number on this screen a user checks against their own
 * memory, so "which day was that workout on" has to mean the day they were
 * standing in — not UTC. A 22:30 session in Belgrade is 20:30 UTC, which is
 * still the same day; the same session at 01:30 is not, and computing in UTC
 * would break the streak on a technicality nobody can see.
 *
 * So dates are handled as calendar keys rather than instants. The conversion
 * from instant to key happens once — here, and in the `at time zone` of the
 * grouping query — and everything after it is string arithmetic that cannot
 * drift by an hour.
 *
 * Pure functions, no imports: `lib/dashboard/queries.ts` is server-only and
 * this is not, so the week strip can do the same maths on either side.
 */

/** `YYYY-MM-DD`, always. */
export type DayKey = string;

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * The calendar day an instant falls on, in `timeZone`.
 *
 * `en-CA` is the shortest way to get ISO order out of `Intl` — it formats as
 * `2026-08-21` natively, so there is no part-by-part reassembly to get wrong.
 */
export function dayKeyOf(date: Date, timeZone: string): DayKey {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * `shiftDay("2026-03-29", -1)`.
 *
 * Deliberately arithmetic on UTC midnight rather than on a local `Date`: the
 * keys carry no time, and a local-time `setDate()` lands on 23:00 the previous
 * day when it steps across a DST boundary. UTC has no such boundary, and since
 * the key was already resolved in the reader's zone, stepping it in UTC keeps
 * meaning "the day before that one".
 */
export function shiftDay(key: DayKey, delta: number): DayKey {
  const [y, m, d] = key.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d) + delta * DAY_MS);

  return [
    shifted.getUTCFullYear(),
    pad(shifted.getUTCMonth() + 1),
    pad(shifted.getUTCDate()),
  ].join("-");
}

/** 0 = Monday. All three locales start the week on Monday. */
export function weekdayIndex(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key: DayKey): DayKey {
  return shiftDay(key, -weekdayIndex(key));
}

/** The seven keys of the week `key` falls in, Monday first. */
export function weekOf(key: DayKey): DayKey[] {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
}

export function toDate(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  // Noon, not midnight: rendering this back through a formatter in a zone
  // behind UTC would otherwise show the previous day.
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export type Streak = {
  /** Days in a row up to and including today, or up to yesterday. */
  current: number;
  /** Longest run inside the window that was loaded. */
  best: number;
  /** Whether today is already one of them. */
  activeToday: boolean;
};

/**
 * Consecutive trained days ending now.
 *
 * Today not being trained *yet* does not break the streak — it is not over
 * until the day is. A streak that resets at midnight and un-resets when you
 * train punishes people for looking at the app in the morning, so the count
 * runs back from today if today is done and from yesterday if it is not.
 */
export function computeStreak(
  active: ReadonlySet<DayKey>,
  today: DayKey,
): Streak {
  const activeToday = active.has(today);

  let current = 0;
  let cursor = activeToday ? today : shiftDay(today, -1);
  while (active.has(cursor)) {
    current += 1;
    cursor = shiftDay(cursor, -1);
  }

  // Longest run anywhere in the window: walk the sorted keys and count how
  // many of them are each other's successor.
  let best = 0;
  let run = 0;
  let previous: DayKey | null = null;
  for (const day of [...active].sort()) {
    run = previous !== null && shiftDay(previous, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    previous = day;
  }

  return { current, best: Math.max(best, current), activeToday };
}
