import type { Translated } from "@/db/schema/i18n";
import type { MetricKind } from "@/lib/taxonomy/config";
import type { SectionKind, SetMode } from "@/lib/workouts/config";

/**
 * The contract between the builder and the save action.
 *
 * Lives outside actions.ts because a `"use server"` module may only export
 * async functions — the same rule that split `lib/taxonomy/types.ts` out.
 *
 * The builder holds the whole session in local state and posts it as one
 * object rather than as FormData: the structure is three levels of nested
 * arrays, and flattening that into `sections[0].items[2].reps` string keys
 * only to parse it back is work with nothing to show for it. The server
 * re-validates the entire shape with zod regardless — a Server Action is
 * reachable by a direct POST.
 */

export type DraftItemInput = {
  exerciseId: string;
  mode: SetMode;
  sets: number;
  /** Set when mode is 'reps'. */
  reps: number | null;
  /** Set when mode is 'time'. */
  durationSec: number | null;
  /** Rest between sets of this movement — the innermost of the three levels. */
  restSec: number;
  rpe: number | null;
  tempo: string | null;
  /** Prescriptions keyed by metric kind, e.g. `{ incline: "6" }`. */
  metrics: Partial<Record<MetricKind, string>>;
  note: Translated;
};

export type DraftSectionInput = {
  kind: SectionKind;
  title: Translated;
  /** 1 = straight sets; above that the block is a circuit. */
  rounds: number;
  restBetweenRoundsSec: number;
  restAfterSec: number;
  items: DraftItemInput[];
};

export type WorkoutDraftInput = {
  id: string;
  title: Translated;
  description: Translated;
  difficulty: Difficulty;
  goalIds: string[];
  activityIds: string[];
  sections: DraftSectionInput[];
};

export type Difficulty =
  | "beginner"
  | "novice"
  | "intermediate"
  | "advanced"
  | "elite";

/** A tuple, not an array: `z.enum` needs the literals to validate against. */
export const DIFFICULTIES = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const satisfies readonly Difficulty[];

export type WorkoutErrorCode =
  | "not_admin"
  | "not_found"
  | "invalid_slug"
  | "slug_taken"
  | "title_required"
  | "invalid_shape"
  | "empty_workout"
  | "too_many_sections"
  | "too_many_items"
  | "unknown_exercise"
  | "in_use"
  | "unknown";

export type WorkoutState = {
  status: "idle" | "error" | "saved";
  code?: WorkoutErrorCode;
  /** Server-recomputed estimate, so the header stops guessing after a save. */
  estimatedDurationSec?: number;
};

export const WORKOUT_IDLE: WorkoutState = { status: "idle" };

export type WorkoutErrorCopy = Record<WorkoutErrorCode, string>;
