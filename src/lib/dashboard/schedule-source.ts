import "server-only";

import type { DayKey } from "./days";
import type { ScheduledDay } from "./types";

/**
 * Where "what am I supposed to train today" comes from.
 *
 * The dashboard is roadmap feature 11 and the thing that answers this question
 * is feature 13 — a client's own calendar, filled from the program the trainer
 * assigned them in feature 12. Neither exists yet, and neither does a table to
 * read: `program_days` (feature 08) says what week 3 day 2 contains, but
 * nothing yet says which human is on week 3 day 2 today.
 *
 * Same shape as `lib/runner/source.ts` and `lib/library/sources.ts`, for the
 * same reason: the screen is written against the interface now so that turning
 * it on later is a new implementation plus one changed line, not a rewrite of
 * the screen. `pending` is not "the week is empty" — the difference is exactly
 * what the reader is told, and an empty week strip with no explanation reads
 * as a bug.
 *
 * **Feature 13 checklist.** Add `dbScheduleSource` here — resolving the
 * assignment row for the user, mapping today's date onto its week/day grid and
 * reading `program_days` — and return it from `getScheduleSource()`. Nothing
 * in `components/dashboard/` changes.
 */
export type ScheduleSource = {
  status: "ready" | "pending";
  /** Inclusive on both ends. One entry per day that has something on it. */
  range(userId: string, from: DayKey, to: DayKey): Promise<ScheduledDay[]>;
};

const pendingScheduleSource: ScheduleSource = {
  status: "pending",
  async range() {
    return [];
  },
};

export function getScheduleSource(): ScheduleSource {
  return pendingScheduleSource;
}

export function isSchedulePending(): boolean {
  return getScheduleSource().status === "pending";
}
