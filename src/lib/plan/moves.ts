import {
  planDayFor,
  shiftDay,
  daysBetween,
  type DayKey,
  type PlanDay,
  type ProgramGrid,
} from "@/lib/clients/schedule";

/**
 * The client's moved days, laid over the plan the trainer assigned.
 *
 * Feature 12 made the calendar a pure function of one date, and that property
 * is worth keeping: no per-day rows means a program the trainer edits reaches
 * everyone already on it, and nothing can drift out of sync with the program
 * it points at. So a client moving Friday's session to Sunday does not
 * materialise the calendar — it records one exception, and the calendar is
 * still derived, now from `(start_date, grid, exceptions)`.
 *
 * Pure functions with no server imports, on purpose: the same overlay runs on
 * the client's calendar and inside the trainer's schedule strip. Two screens
 * computing the same week differently is exactly how a coach and a client end
 * up looking at different plans.
 */

export type Move = { fromDay: DayKey; toDay: DayKey };

/**
 * Moves in the two directions they get asked about. Both ends are unique in
 * the database, so both maps are one-to-one.
 */
export type MoveIndex = {
  byFrom: Map<DayKey, DayKey>;
  byTo: Map<DayKey, DayKey>;
};

export const NO_MOVES: MoveIndex = { byFrom: new Map(), byTo: new Map() };

export function indexMoves(moves: readonly Move[]): MoveIndex {
  const byFrom = new Map<DayKey, DayKey>();
  const byTo = new Map<DayKey, DayKey>();

  for (const move of moves) {
    byFrom.set(move.fromDay, move.toDay);
    byTo.set(move.toDay, move.fromDay);
  }

  return { byFrom, byTo };
}

/** One calendar day, after the client's own rearranging. */
export type PlanSlot = {
  day: DayKey;
  /** What is on this day now. Its `day` field is this day, not the origin. */
  plan: PlanDay;
  /** Where this day's content came from, when it was moved here. */
  movedFrom: DayKey | null;
  /** Where the content the plan put here went instead. */
  movedTo: DayKey | null;
};

/**
 * What a day holds once the moves are applied.
 *
 * Arrivals are resolved before departures. The two sets never actually
 * overlap — a move may only target a day with no workout on it, so a target
 * has nothing of its own to send anywhere — but the order is fixed here rather
 * than left to whichever branch is written first, because a rule nobody stated
 * is a rule nobody can check.
 */
export function planSlotFor(
  grid: ProgramGrid,
  startDate: DayKey,
  moves: MoveIndex,
  day: DayKey,
): PlanSlot {
  const origin = moves.byTo.get(day);
  if (origin) {
    return {
      day,
      plan: { ...planDayFor(grid, startDate, origin), day },
      movedFrom: origin,
      movedTo: null,
    };
  }

  const target = moves.byFrom.get(day);
  const plan = planDayFor(grid, startDate, day);

  if (target) {
    // The week and day numbers stay: the reader still wants to be told which
    // slot of the plan this was, next to the line saying where it went.
    return {
      day,
      plan: {
        ...plan,
        kind: "open",
        workoutId: null,
        workoutSlug: null,
        workoutTitle: null,
      },
      movedFrom: null,
      movedTo: target,
    };
  }

  return { day, plan, movedFrom: null, movedTo: null };
}

/** Inclusive on both ends. */
export function planSlots(
  grid: ProgramGrid,
  startDate: DayKey,
  moves: MoveIndex,
  from: DayKey,
  to: DayKey,
): PlanSlot[] {
  const span = daysBetween(from, to);
  if (span < 0) return [];

  return Array.from({ length: span + 1 }, (_, i) =>
    planSlotFor(grid, startDate, moves, shiftDay(from, i)),
  );
}

/**
 * How far a day may be moved, in days either way.
 *
 * A limit rather than none at all: the point of moving a day is fitting the
 * week around a life, not rewriting the program. Someone pushing a session
 * three months out has stopped following the plan, and the honest answer to
 * that is a conversation with the coach, not a date field that accepts it.
 */
export const MOVE_WINDOW_DAYS = 21;

export type MoveCheck =
  | { ok: true }
  | { ok: false; reason: "not_movable" | "out_of_window" | "target_busy" };

/**
 * Whether `from` may move to `to`, given the plan as it currently stands.
 *
 * Called by the server action before writing, and by nothing else — the UI
 * offers a date field rather than a pre-filtered list of days, because
 * enumerating the legal targets on the screen is a second implementation of
 * this rule and the two would diverge.
 */
export function canMove(
  grid: ProgramGrid,
  startDate: DayKey,
  moves: MoveIndex,
  from: DayKey,
  to: DayKey,
): MoveCheck {
  if (from === to) return { ok: false, reason: "not_movable" };

  // Measured from where the *program* put the session, not from where it
  // currently sits. Otherwise every move resets the budget and a session can
  // walk out of the plan three weeks at a time.
  const origin = moves.byTo.get(from) ?? from;
  if (Math.abs(daysBetween(origin, to)) > MOVE_WINDOW_DAYS) {
    return { ok: false, reason: "out_of_window" };
  }

  const source = planSlotFor(grid, startDate, moves, from);
  if (source.plan.kind !== "workout" || !source.plan.workoutSlug) {
    return { ok: false, reason: "not_movable" };
  }

  const target = planSlotFor(grid, startDate, moves, to);
  if (target.plan.kind === "workout") {
    return { ok: false, reason: "target_busy" };
  }

  return { ok: true };
}
