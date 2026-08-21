import {
  EMPTY_FILTERS,
  FILTER_PARAMS,
  STATUS_FILTERS,
  VIDEO_FILTERS,
  isDifficulty,
  type ExerciseFilters,
  type StatusFilter,
  type VideoFilter,
} from "@/lib/exercises/types";

/** What `await searchParams` hands back in Next 16. */
type RawSearchParams = Record<string, string | string[] | undefined>;

function one(params: RawSearchParams, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function uuidOrNull(value: string): string | null {
  return UUID.test(value) ? value : null;
}

/**
 * The query string is user input — a hand-edited URL is the normal way this
 * gets a value nobody expected. Anything unrecognised falls back to the
 * default rather than reaching the query builder.
 */
export function readFilters(params: RawSearchParams): ExerciseFilters {
  const status = one(params, FILTER_PARAMS.status);
  const video = one(params, FILTER_PARAMS.video);
  const difficulty = one(params, FILTER_PARAMS.difficulty);

  return {
    ...EMPTY_FILTERS,
    q: one(params, FILTER_PARAMS.q).slice(0, 80),
    status: (STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as StatusFilter)
      : "all",
    video: (VIDEO_FILTERS as readonly string[]).includes(video)
      ? (video as VideoFilter)
      : "all",
    difficulty: isDifficulty(difficulty) ? difficulty : null,
    equipmentId: uuidOrNull(one(params, FILTER_PARAMS.equipmentId)),
    muscleGroupId: uuidOrNull(one(params, FILTER_PARAMS.muscleGroupId)),
    activityId: uuidOrNull(one(params, FILTER_PARAMS.activityId)),
  };
}
