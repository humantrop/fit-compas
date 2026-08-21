import type { Translated } from "@/db/schema/i18n";
import type { AssignmentStatus } from "@/db/schema/clients";
import type { DayKey, PlanDay } from "@/lib/clients/schedule";

/**
 * What the client's own plan screen reads and writes.
 *
 * Separate from actions.ts because a `"use server"` module may only export
 * async functions. Actions return an error *code*, never a sentence — the
 * screen maps it through this feature's copy module, so the reader is told
 * what happened in their own language.
 */

export type PlanErrorCode =
  | "unauthenticated"
  /** Nothing to act on: the trainer has not assigned a program. */
  | "no_plan"
  | "invalid_day"
  /** The day holds no workout — a rest day and an empty day cannot be moved. */
  | "not_movable"
  | "out_of_window"
  /** Something is already scheduled on the day being moved to. */
  | "target_busy"
  /** Moving a session onto a day that has already been and gone. */
  | "target_past"
  /** Ticking off a day that is already down as trained. */
  | "already_done"
  /** Undoing a tick on a day the runner logged — that row is not ours to delete. */
  | "not_marked"
  /** You cannot have trained tomorrow. */
  | "future_day"
  /** The session log is unreachable — migration 0010 has not been applied. */
  | "unavailable"
  | "unknown";

export type PlanState = {
  status: "idle" | "error" | "saved";
  code?: PlanErrorCode;
};

export const PLAN_IDLE: PlanState = { status: "idle" };

export type PlanErrorCopy = Record<PlanErrorCode, string>;

/* ------------------------------------------------------------------ views */

/**
 * One day of the client's calendar: what the plan says, where it moved, and
 * what actually happened.
 *
 * `plan.kind` is the plan's answer and `done` is the log's — they are kept
 * apart because the interesting days are the ones where they disagree.
 */
export type PlanDayView = {
  day: DayKey;
  plan: PlanDay;
  /** This day's session was originally scheduled on that day. */
  movedFrom: DayKey | null;
  /** What the plan put here happens on that day instead. */
  movedTo: DayKey | null;

  isToday: boolean;
  isPast: boolean;

  /** Finished sessions logged on this calendar day, in the reader's zone. */
  done: number;
  /** One of them was the workout the plan asked for. */
  matched: boolean;
  /** The match is a tick the client added, not a workout the runner recorded. */
  selfReported: boolean;
};

/**
 * The plan as a whole.
 *
 * `note` from the assignment is deliberately absent. Migration 0012 says why
 * the trainer's reason for a program is trainer-only, and the way to keep a
 * field off a screen is to keep it out of the type the screen is given.
 */
export type PlanView = {
  program: {
    title: Translated;
    slug: string;
    daysPerWeek: number;
    weekCount: number;
  } | null;
  assignmentStatus: AssignmentStatus | null;

  startDate: DayKey | null;
  endDate: DayKey | null;
  pausedOn: DayKey | null;

  /** Where today falls in the plan. Null before it starts and after it ends. */
  progress: {
    week: number;
    day: number;
    totalWeeks: number;
    percent: number;
  } | null;

  today: DayKey;
  timeZone: string;

  /** The requested window, one entry per day, inclusive on both ends. */
  days: PlanDayView[];

  /** False when the runner's log tables are unreachable — the screen says so. */
  logAvailable: boolean;
};
