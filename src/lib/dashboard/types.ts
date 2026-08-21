import type { Translated } from "@/db/schema/i18n";

import type { DayKey, Streak } from "./days";

/**
 * What the dashboard shows. Types only — pulled into client components.
 */

/** One calendar day's worth of finished sessions. */
export type DayActivity = {
  day: DayKey;
  sessions: number;
  sets: number;
  /** Kilograms. */
  volume: number;
  seconds: number;
};

export type Totals = {
  workouts: number;
  sets: number;
  volume: number;
  seconds: number;
};

/** A workout the user started and never finished. Offered as "continue". */
export type OpenSession = {
  id: string;
  workoutRef: string;
  workoutTitle: string;
  startedAt: string;
  completedSets: number;
  totalSets: number;
};

/**
 * What the coach put on a given day.
 *
 * `rest` and `open` are different states on purpose, the same distinction the
 * program editor makes in feature 08: a rest day is a decision, an open day is
 * the absence of one. Telling a client "rest today" when nobody said so is a
 * training instruction the app invented.
 */
export type ScheduledDay = {
  day: DayKey;
  kind: "workout" | "rest" | "open";
  /** The slug the runner opens. Null for rest and open days. */
  workoutRef: string | null;
  title: Translated | null;
  summary: Translated | null;
  /** e.g. "Week 3 · Day 2", already resolved by the source. */
  context: Translated | null;
};

/** One square in the week strip. */
export type WeekDay = {
  day: DayKey;
  /** 0 = Monday. */
  index: number;
  isToday: boolean;
  isFuture: boolean;
  /** At least one finished session. */
  done: boolean;
  activity: DayActivity | null;
  scheduled: ScheduledDay | null;
};

export type DashboardStats = {
  /** Newest last, one entry per day that has any activity. */
  days: DayActivity[];
  allTime: Totals;
  streak: Streak;
  open: OpenSession | null;
  /** False when the log tables are unreachable — the screen says so. */
  available: boolean;
};
