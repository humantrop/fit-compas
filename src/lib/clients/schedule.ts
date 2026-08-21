import type { Translated } from "@/db/schema/i18n";

/**
 * Turning "week 3, day 2" into "Thursday the 9th".
 *
 * A program (feature 08) is a grid: weeks x `daysPerWeek` slots. An assignment
 * says which calendar day slot one of week one falls on. Everything else is
 * subtraction — the day N slots after the start is week `floor(N / w)`, slot
 * `N mod w` — so nothing is stored per day and moving the whole plan a week
 * later is one changed date rather than a rewritten calendar.
 *
 * Pure functions with no server imports, so the schedule strip can do the same
 * arithmetic on either side of the wire.
 *
 * The day arithmetic below is deliberately a local copy of what
 * `lib/dashboard/days.ts` does for feature 11 rather than an import: these two
 * features were built in parallel sessions and the repo's convention while
 * that is true is that a feature owns its own small helpers. Worth folding
 * into one module once the parallel work has settled.
 */

/** `YYYY-MM-DD`, always. */
export type DayKey = string;

const DAY_MS = 86_400_000;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * The calendar day an instant falls on, in `timeZone`. `en-CA` formats as
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
 * Arithmetic on UTC midnight rather than on a local `Date`: the keys carry no
 * time, and `setDate()` on a local date lands on 23:00 the previous day when it
 * steps across a DST boundary.
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

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const [ay, am, ad] = from.split("-").map(Number);
  const [by, bm, bd] = to.split("-").map(Number);

  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS,
  );
}

/** Noon, not midnight: a formatter in a zone behind UTC would show yesterday. */
export function toDate(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function isValidDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/* ------------------------------------------------------------------- grid */

/** One slot of a program week, already resolved against `workouts`. */
export type GridDay = {
  position: number;
  isRest: boolean;
  workoutId: string | null;
  workoutSlug: string | null;
  workoutTitle: Translated | null;
  note: Translated | null;
};

export type GridWeek = {
  id: string;
  position: number;
  label: Translated | null;
  days: GridDay[];
};

export type ProgramGrid = {
  programId: string;
  title: Translated;
  daysPerWeek: number;
  weeks: GridWeek[];
};

/**
 * What a given calendar day holds.
 *
 * `rest` and `open` are different states, the same distinction the program
 * editor makes: a rest day is a decision, an open day is the absence of one.
 * `before` and `after` are the days outside the plan's own span — a plan that
 * starts next Monday has to be able to say so rather than render as five empty
 * squares.
 */
export type PlanKind = "workout" | "rest" | "open" | "before" | "after";

export type PlanDay = {
  day: DayKey;
  kind: PlanKind;
  /** Zero-based, and null outside the plan. */
  weekIndex: number | null;
  dayIndex: number | null;
  weekLabel: Translated | null;
  workoutId: string | null;
  workoutSlug: string | null;
  workoutTitle: Translated | null;
  note: Translated | null;
};

function outside(day: DayKey, kind: "before" | "after"): PlanDay {
  return {
    day,
    kind,
    weekIndex: null,
    dayIndex: null,
    weekLabel: null,
    workoutId: null,
    workoutSlug: null,
    workoutTitle: null,
    note: null,
  };
}

/** How many calendar days the plan covers, start day included. */
export function planLength(grid: ProgramGrid): number {
  return grid.weeks.length * grid.daysPerWeek;
}

/** The last day of the plan, or null when it has no weeks at all. */
export function planEnd(grid: ProgramGrid, startDate: DayKey): DayKey | null {
  const length = planLength(grid);
  return length > 0 ? shiftDay(startDate, length - 1) : null;
}

export function planDayFor(
  grid: ProgramGrid,
  startDate: DayKey,
  day: DayKey,
): PlanDay {
  const offset = daysBetween(startDate, day);
  if (offset < 0) return outside(day, "before");
  if (offset >= planLength(grid)) return outside(day, "after");

  const weekIndex = Math.floor(offset / grid.daysPerWeek);
  const dayIndex = offset % grid.daysPerWeek;

  const week = grid.weeks[weekIndex];
  const slot = week?.days.find((entry) => entry.position === dayIndex);

  // A week whose slots were somehow lost still renders — as an open day the
  // admin can see and fix, rather than as a hole in the calendar.
  if (!week || !slot) {
    return {
      ...outside(day, "after"),
      kind: "open",
      weekIndex,
      dayIndex,
      weekLabel: week?.label ?? null,
    };
  }

  return {
    day,
    kind: slot.workoutId ? "workout" : slot.isRest ? "rest" : "open",
    weekIndex,
    dayIndex,
    weekLabel: week.label,
    workoutId: slot.workoutId,
    workoutSlug: slot.workoutSlug,
    workoutTitle: slot.workoutTitle,
    note: slot.note,
  };
}

/** Inclusive on both ends. */
export function planRange(
  grid: ProgramGrid,
  startDate: DayKey,
  from: DayKey,
  to: DayKey,
): PlanDay[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];

  return Array.from({ length: span + 1 }, (_, i) =>
    planDayFor(grid, startDate, shiftDay(from, i)),
  );
}

/**
 * Where the client stands in the plan today: 1-based so it reads as
 * "week 3 of 8" without an off-by-one in every template. Null before the start
 * and after the end.
 */
export function planProgress(
  grid: ProgramGrid,
  startDate: DayKey,
  today: DayKey,
): { week: number; day: number; totalWeeks: number; percent: number } | null {
  const offset = daysBetween(startDate, today);
  const length = planLength(grid);
  if (offset < 0 || length === 0 || offset >= length) return null;

  return {
    week: Math.floor(offset / grid.daysPerWeek) + 1,
    day: (offset % grid.daysPerWeek) + 1,
    totalWeeks: grid.weeks.length,
    percent: Math.round(((offset + 1) / length) * 100),
  };
}
