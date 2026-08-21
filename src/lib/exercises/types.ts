import type { difficulty } from "@/db/schema/enums";

/**
 * Shared contract between the exercise Server Actions and the forms.
 *
 * Separate from actions.ts because a `"use server"` module may only export
 * async functions — the same rule that split lib/auth/types.ts and
 * lib/taxonomy/types.ts out of their action files.
 *
 * Actions return an error *code*, never a sentence. The client maps it through
 * the dictionary so the admin reads it in the language they picked.
 */

export type ExerciseErrorCode =
  | "not_admin"
  | "not_found"
  | "title_required"
  | "invalid_slug"
  | "slug_taken"
  | "invalid_tag"
  | "video_not_ready"
  | "video_too_large"
  | "video_type"
  | "upload_failed"
  | "unknown";

export type ExerciseState = {
  status: "idle" | "error" | "saved";
  code?: ExerciseErrorCode;
};

export const EXERCISE_IDLE: ExerciseState = { status: "idle" };

export type ExerciseErrorCopy = Record<ExerciseErrorCode, string>;

/**
 * Result shape for the actions the uploader calls directly, outside a form.
 * `T` defaults to nothing extra, for the ones that only report success.
 */
export type ActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: ExerciseErrorCode };

/**
 * Whether the movement is counted or timed. Stored as text rather than an
 * enum: the workout builder overrides it per set anyway, so the column is a
 * default, not a constraint worth a migration to extend.
 */
export const DEFAULT_MODES = ["reps", "time"] as const;
export type DefaultMode = (typeof DEFAULT_MODES)[number];

export function isDefaultMode(value: unknown): value is DefaultMode {
  return (DEFAULT_MODES as readonly unknown[]).includes(value);
}

export type Difficulty = (typeof difficulty)["enumValues"][number];

/**
 * Spelled out rather than read from `difficulty.enumValues` so this file stays
 * value-import-free and can be pulled into client components. `satisfies`
 * catches a value removed from the enum.
 */
export const DIFFICULTIES = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const satisfies readonly Difficulty[];

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly unknown[]).includes(value);
}

/** Which vocabularies tag an exercise. Muscle groups carry a primary flag. */
export const TAG_FIELDS = ["equipment", "muscles", "goals", "activities"] as const;
export type TagField = (typeof TAG_FIELDS)[number];

export type ExerciseTagIds = Record<TagField, string[]> & {
  /** Subset of `muscles`: the primary movers. */
  primaryMuscles: string[];
};

export const EMPTY_TAGS: ExerciseTagIds = {
  equipment: [],
  muscles: [],
  goals: [],
  activities: [],
  primaryMuscles: [],
};

/* ------------------------------------------------------------------ filters */

export const STATUS_FILTERS = ["all", "published", "draft"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const VIDEO_FILTERS = ["all", "with", "without", "problem"] as const;
export type VideoFilter = (typeof VIDEO_FILTERS)[number];

export type ExerciseFilters = {
  q: string;
  status: StatusFilter;
  video: VideoFilter;
  difficulty: Difficulty | null;
  equipmentId: string | null;
  muscleGroupId: string | null;
  activityId: string | null;
};

export const EMPTY_FILTERS: ExerciseFilters = {
  q: "",
  status: "all",
  video: "all",
  difficulty: null,
  equipmentId: null,
  muscleGroupId: null,
  activityId: null,
};

/** Query-string keys, shared by the page reader and the filter bar. */
export const FILTER_PARAMS = {
  q: "q",
  status: "status",
  video: "video",
  difficulty: "level",
  equipmentId: "equipment",
  muscleGroupId: "muscle",
  activityId: "activity",
} as const satisfies Record<keyof ExerciseFilters, string>;

export function hasActiveFilters(filters: ExerciseFilters): boolean {
  return (
    filters.q !== "" ||
    filters.status !== "all" ||
    filters.video !== "all" ||
    filters.difficulty !== null ||
    filters.equipmentId !== null ||
    filters.muscleGroupId !== null ||
    filters.activityId !== null
  );
}
