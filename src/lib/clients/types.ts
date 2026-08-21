import type { Translated } from "@/db/schema/i18n";
import type { AssignmentStatus } from "@/db/schema/clients";

import type { DayKey, PlanDay } from "./schedule";

/**
 * Shared contract for the client screens.
 *
 * Separate from actions.ts because a `"use server"` module may only export
 * async functions. Actions return an error *code*, never a sentence, so the
 * client maps it through the feature's copy module and the admin reads it in
 * their own language.
 */
export type ClientErrorCode =
  | "not_admin"
  | "not_found"
  | "program_missing"
  | "invalid_date"
  | "note_required"
  | "note_too_long"
  | "unknown";

export type ClientState = {
  status: "idle" | "error" | "saved";
  code?: ClientErrorCode;
};

export const CLIENT_IDLE: ClientState = { status: "idle" };

export type ClientErrorCopy = Record<ClientErrorCode, string>;

export const NOTE_MAX = 2000;

/* ------------------------------------------------------------------ views */

/** One row of the client list. */
export type ClientSummary = {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
  locale: string | null;
  joinedAt: string;
  /** Null when the account has never signed in. */
  lastSignInAt: string | null;
  emailConfirmed: boolean;

  /** The live plan — active or paused — if there is one. */
  plan: {
    assignmentId: string;
    programId: string;
    programTitle: Translated;
    status: AssignmentStatus;
    startDate: DayKey;
  } | null;

  sessions: number;
  /** Finished sessions in the last 30 days. */
  recentSessions: number;
  lastSessionAt: string | null;
  noteCount: number;
};

export type AssignmentView = {
  id: string;
  programId: string;
  programSlug: string;
  programTitle: Translated;
  status: AssignmentStatus;
  startDate: DayKey;
  pausedOn: DayKey | null;
  endedOn: DayKey | null;
  note: string | null;
  createdAt: string;
};

export type NoteView = {
  id: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SessionView = {
  id: string;
  workoutRef: string;
  workoutTitle: string;
  status: string;
  startedAt: string;
  elapsedSec: number;
  completedSets: number;
  totalSets: number;
  volume: number;
  rpe: number | null;
  notes: string | null;
};

/** A scheduled day with what actually happened on it stitched on. */
export type ScheduleEntry = {
  plan: PlanDay;
  isToday: boolean;
  isPast: boolean;
  /** Finished sessions logged on that calendar day. */
  done: number;
  /** True when one of them was the workout the plan asked for. */
  matched: boolean;
};

export type ClientDetail = {
  profile: {
    id: string;
    fullName: string | null;
    email: string | null;
    avatarUrl: string | null;
    locale: string | null;
    units: string;
    role: string;
    joinedAt: string;
    lastSignInAt: string | null;
    emailConfirmed: boolean;
  };
  assignment: AssignmentView | null;
  history: AssignmentView[];
  notes: NoteView[];
  sessions: SessionView[];
  totals: {
    sessions: number;
    sets: number;
    volume: number;
    seconds: number;
  };
  /** Empty when there is no live plan, or when the program has no weeks. */
  schedule: ScheduleEntry[];
  /** The last day of the live plan, computed from its grid. */
  planEnd: DayKey | null;
  /** Where in the plan today falls. Null before the start and after the end. */
  progress: { week: number; day: number; totalWeeks: number; percent: number } | null;
  today: DayKey;
  timeZone: string;
  /** False when the runner's log tables are unreachable — the screen says so. */
  logAvailable: boolean;
};

/** What the assign form offers. */
export type ProgramOption = {
  id: string;
  title: Translated;
  isPublished: boolean;
  weekCount: number;
  daysPerWeek: number;
};
