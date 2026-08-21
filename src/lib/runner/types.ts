import type { metricKind } from "@/db/schema/enums";
import type { Translated } from "@/db/schema/i18n";

/**
 * What the runner needs to perform a workout, and nothing else.
 *
 * The workout *builder* is roadmap feature 07 and does not exist yet, so this
 * is deliberately a contract rather than a set of database rows: the runner is
 * written against `RunnerPlan`, `lib/runner/source.ts` decides where a plan
 * comes from, and feature 07 swaps the source. See the comment there.
 *
 * Types only — no value imports. This module is pulled into client components.
 */

export type MetricKind = (typeof metricKind)["enumValues"][number];

/** Reps or seconds. A squat is reps, a plank is time. */
export type RunnerMode = "reps" | "time";

export type SectionKind = "warmup" | "main" | "cooldown";

export type RunnerItem = {
  /** Unique inside its section. Part of the step key that identifies a set. */
  key: string;
  /** Null for the built-in demo plans, set once feature 06 fills the library. */
  exerciseId: string | null;
  title: Translated;
  /** Shown over the player during the set: "elbows tucked". */
  cues: Translated | null;

  /**
   * Resolved playback URL. The runner never touches storage paths — feature 06
   * owns signing, and swapping Supabase Storage for Mux must not reach in here.
   */
  videoUrl: string | null;
  posterUrl: string | null;

  mode: RunnerMode;
  reps: number | null;
  durationSec: number | null;

  /** e.g. "3-1-2-0". Displayed, never enforced. */
  tempo: string | null;
  /** Target effort 1-10, prescribed by the coach. */
  rpe: number | null;

  /** Rest after this exercise, before the next one in the same round. */
  restSec: number;

  /**
   * Which numeric fields the logger shows besides reps. Comes from the
   * equipment's metrics: a treadmill asks for incline and speed, a barbell for
   * weight. `weight` is the only one that counts toward volume.
   */
  metrics: MetricKind[];

  /** Doubles the time estimate — each side is a set's worth of work. */
  isUnilateral: boolean;
};

export type RunnerSection = {
  key: string;
  kind: SectionKind;
  title: Translated | null;
  /** How many times the whole item list repeats. */
  rounds: number;
  /** Rest between rounds of this section. */
  restBetweenRoundsSec: number;
  /** Rest after the section ends, before the next one starts. */
  restAfterSec: number;
  items: RunnerItem[];
};

export type RunnerPlan = {
  id: string;
  /** What `workout_sessions.workout_ref` stores, and the URL segment. */
  slug: string;
  title: Translated;
  summary: Translated | null;
  difficulty: "beginner" | "novice" | "intermediate" | "advanced" | "elite";
  sections: RunnerSection[];
};

/** The card in the list at /workout, without loading the whole plan. */
export type RunnerPlanSummary = {
  slug: string;
  title: Translated;
  summary: Translated | null;
  difficulty: RunnerPlan["difficulty"];
  sets: number;
  estimatedSec: number;
};

/* -------------------------------------------------------------------------
   The flattened timeline the runner actually walks.
   ------------------------------------------------------------------------- */

export type ExerciseStep = {
  kind: "exercise";
  /** `<section>:<item>:<round>` — stable across reloads, keys the set log. */
  key: string;
  sectionKey: string;
  sectionKind: SectionKind;
  sectionTitle: Translated | null;
  round: number;
  totalRounds: number;
  item: RunnerItem;
  /** 1-based position among all sets in the workout. */
  setNumber: number;
};

/** Why we are resting — the three levels the builder prescribes. */
export type RestScope = "set" | "round" | "section";

export type RestStep = {
  kind: "rest";
  key: string;
  scope: RestScope;
  durationSec: number;
  /** The exercise this rest leads into, for the "up next" line. */
  nextTitle: Translated | null;
};

export type RunnerStep = ExerciseStep | RestStep;

export type RunnerTimeline = {
  steps: RunnerStep[];
  totalSets: number;
  estimatedSec: number;
};

/* -------------------------------------------------------------------------
   What the client sends back for one set.
   ------------------------------------------------------------------------- */

export type SetEntry = {
  stepKey: string;
  reps: number | null;
  durationSec: number | null;
  weight: number | null;
  metrics: Partial<Record<MetricKind, number>>;
  rpe: number | null;
  skipped: boolean;
};

export type RunnerSessionState = {
  /** Null when the log is unavailable — the workout still runs, unrecorded. */
  id: string | null;
  startedAt: string | null;
  /** Step keys already written down, so a reload resumes where it stopped. */
  loggedKeys: string[];
};

/* -------------------------------------------------------------------------
   Server action results.

   These live here rather than next to the actions because a "use server" file
   may only export async functions — a `export type` in one is a build error,
   and the error message does not say so.
   ------------------------------------------------------------------------- */

export type RunnerErrorCode =
  | "unauthenticated"
  | "invalid"
  | "not_found"
  /** The log tables are not there — migration 0010 has not been applied. */
  | "unavailable";

export type StartSessionResult =
  | { ok: true; session: RunnerSessionState }
  | { ok: false; code: RunnerErrorCode };

export type LogSetResult = { ok: true } | { ok: false; code: RunnerErrorCode };

export type FinishSessionResult =
  | { ok: true; completedSets: number; totalVolume: number }
  | { ok: false; code: RunnerErrorCode };

/** What the client sends alongside an entry so the row reads on its own. */
export type SetContext = {
  exerciseId: string | null;
  exerciseTitle: string;
  section: string;
  round: number;
  position: number;
  mode: RunnerMode;
};
