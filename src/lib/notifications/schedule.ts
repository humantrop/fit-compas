import {
  dayKeyOf,
  shiftDay,
  type DayKey,
} from "@/lib/clients/schedule";

/**
 * When a repeating notification fires next.
 *
 * Pure, no server imports — the composer previews "next: Monday at 09:00"
 * in the browser using the same function the dispatcher advances the cursor
 * with, so the preview cannot promise a time the dispatcher will not honour.
 *
 * The day arithmetic is imported from feature 12 rather than copied. Feature 15
 * depends on 12 by the roadmap and 12 has landed, so the usual "a feature owns
 * its own helpers while the parallel sessions run" convention has nothing left
 * to protect here — two definitions of `shiftDay` would.
 *
 * **Everything below works in wall time, not instants.** A message stores
 * "09:00 in Europe/Belgrade", and the instant that means is recomputed at every
 * advance. Storing the instant instead and adding 24h would drift an hour twice
 * a year — a 09:00 habit reminder arriving at 10:00 through the winter is the
 * kind of bug that gets a notification muted rather than reported.
 */

export type Repeat = "once" | "daily" | "weekly";

export type ScheduleSpec = {
  repeat: Repeat;
  /** Minutes past local midnight. Required for `daily` and `weekly`. */
  minutes: number | null;
  timeZone: string;
  /** ISO weekdays, 1 = Monday .. 7 = Sunday. Only read when `weekly`. */
  days: number[];
  startsOn: DayKey | null;
  endsOn: DayKey | null;
  /** The exact instant, for `once`. */
  at: Date | null;
};

/** A repeat that never matches would otherwise scan forever. */
const HORIZON_DAYS = 400;

/* ------------------------------------------------------------ wall clock */

/**
 * How far `timeZone` is from UTC at that instant, in milliseconds.
 *
 * Formatting the instant in the zone and reading the result back as if it were
 * UTC is the standard way to get this without a time-zone library: the
 * difference between the two is the offset, DST included, because ICU already
 * applied the rules.
 */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const at = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  // `hour12: false` renders midnight as 24 in some ICU versions.
  const hour = at("hour") % 24;

  const asUtc = Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    hour,
    at("minute"),
    at("second"),
  );

  // The parts carry no milliseconds, so the instant is truncated to the second
  // before subtracting or every offset comes out a few hundred ms wrong.
  return asUtc - (date.getTime() - date.getMilliseconds());
}

/**
 * The instant at which the clock in `timeZone` reads `minutes` past midnight on
 * `day`.
 *
 * Two passes, because the offset has to be measured *at the answer* and the
 * answer is what we are solving for. Guessing with the offset at the naive
 * timestamp and re-measuring at the guess converges everywhere except inside
 * the one hour a year that does not exist, where it lands just after the jump —
 * which is the behaviour a reminder wants anyway.
 */
export function instantAt(
  day: DayKey,
  minutes: number,
  timeZone: string,
): Date {
  const [year, month, date] = day.split("-").map(Number);
  const naive = Date.UTC(year, month - 1, date, 0, minutes);

  const first = naive - zoneOffsetMs(new Date(naive), timeZone);
  const second = naive - zoneOffsetMs(new Date(first), timeZone);

  return new Date(second);
}

/** 1 = Monday .. 7 = Sunday, matching `repeat_days` and ISO-8601. */
export function isoWeekday(day: DayKey): number {
  const [year, month, date] = day.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/* ----------------------------------------------------------------- times */

/** `"09:00"` or `"09:00:00"` to minutes past midnight, or null if it is junk. */
export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Minutes past midnight back to `HH:MM`, which is what `<input type="time">`
 *  and Postgres `time` both accept. */
export function formatTimeOfDay(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/* ------------------------------------------------------------- next run */

/**
 * The first firing strictly after `after`, or null when the schedule is spent.
 *
 * Strictly after, not at-or-after: this is called with the instant that just
 * fired, and an inclusive comparison would hand back the same occurrence and
 * spin the dispatcher on one message forever.
 */
export function nextRun(spec: ScheduleSpec, after: Date): Date | null {
  if (spec.repeat === "once") {
    return spec.at && spec.at.getTime() > after.getTime() ? spec.at : null;
  }

  if (spec.minutes === null) return null;
  if (spec.repeat === "weekly" && spec.days.length === 0) return null;

  // Start from whichever comes later: the day the schedule opens, or the day
  // `after` falls on in the message's own zone. Starting from "today" in UTC
  // would skip an evening reminder for every reader east of Greenwich.
  const fromCursor = dayKeyOf(after, spec.timeZone);
  let day =
    spec.startsOn && spec.startsOn > fromCursor ? spec.startsOn : fromCursor;

  for (let step = 0; step <= HORIZON_DAYS; step += 1) {
    if (spec.endsOn && day > spec.endsOn) return null;

    const matches =
      spec.repeat === "daily" || spec.days.includes(isoWeekday(day));

    if (matches) {
      const instant = instantAt(day, spec.minutes, spec.timeZone);
      if (instant.getTime() > after.getTime()) return instant;
    }

    day = shiftDay(day, 1);
  }

  return null;
}

/**
 * Which firing this is, for the unique index that makes dispatch idempotent.
 *
 * The occurrence's calendar day in the message's zone — one firing per day is
 * all the schedule can express, so the day is enough to name it, and it stays
 * readable in the table when something needs explaining.
 */
export function occurrenceKey(spec: ScheduleSpec, instant: Date): string {
  return spec.repeat === "once" ? "once" : dayKeyOf(instant, spec.timeZone);
}

export type { DayKey };
