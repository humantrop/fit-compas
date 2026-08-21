import type { BodyMetric, PhotoPose } from "@/db/schema/progress";
import type { DayKey } from "@/lib/clients/schedule";
import type { Streak } from "@/lib/dashboard/days";
import type { DayActivity, Totals } from "@/lib/dashboard/types";

import type { PhotoUploadTicket } from "./photos";

/**
 * What the progress screens read and write.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export
 * async functions. Actions return an error *code*, never a sentence — the
 * screen maps it through this feature's copy module, so the reader is told what
 * happened in their own language.
 */

export type ProgressErrorCode =
  | "unauthenticated"
  | "invalid_metric"
  | "invalid_day"
  /** A day that has not happened yet cannot have been measured. */
  | "future_day"
  | "invalid_value"
  /** The number is a number but not a measurement of a person. */
  | "out_of_range"
  | "not_found"
  | "invalid_pose"
  | "file_too_large"
  | "wrong_type"
  | "upload_failed"
  /** The tables are unreachable — migration 0014 has not been applied. */
  | "unavailable"
  | "unknown";

export type ProgressState = {
  status: "idle" | "error" | "saved";
  code?: ProgressErrorCode;
};

export const PROGRESS_IDLE: ProgressState = { status: "idle" };

export type ProgressErrorCopy = Record<ProgressErrorCode, string>;

/** Actions the uploader calls directly rather than through a `<form>`. */
export type TicketResult =
  | { ok: true; ticket: PhotoUploadTicket }
  | { ok: false; code: ProgressErrorCode };

export type ConfirmResult =
  | { ok: true }
  | { ok: false; code: ProgressErrorCode };

/* ------------------------------------------------------------------ views */

export type MeasurementPoint = {
  day: DayKey;
  /** Canonical units — kg, cm, percent. Converted at the component. */
  value: number;
};

/**
 * One metric's history, plus the three numbers the card above the chart shows.
 *
 * `change` is against the *first* point in the loaded window rather than
 * against the previous entry: "down 2 kg since you started" is the sentence
 * somebody wants, where "down 0.2 kg since Tuesday" is noise a bathroom scale
 * produces on its own. `previous` is kept beside it for the history table,
 * which does want the step-by-step version.
 */
export type MetricSeries = {
  metric: BodyMetric;
  points: MeasurementPoint[];

  latest: MeasurementPoint | null;
  first: MeasurementPoint | null;
  /** `latest - first`, in canonical units. Null with fewer than two points. */
  change: number | null;
};

export type MeasurementEntry = {
  metric: BodyMetric;
  day: DayKey;
  value: number;
  /** The entry before this one for the same metric, for the row's delta. */
  previous: number | null;
};

export type PhotoView = {
  id: string;
  takenOn: DayKey;
  pose: PhotoPose;
  /**
   * Short-lived signed URL, or null when it could not be minted. The bucket is
   * private, so there is no unsigned fallback — a null renders as a placeholder
   * rather than as a broken image.
   */
  url: string | null;
  width: number | null;
  height: number | null;
};

/**
 * Everything the overview screen shows.
 *
 * Two halves that never mix: what the body did, read from `body_measurements`,
 * and what the training did, read from `workout_sessions`. The second half is
 * the dashboard's own reader, called rather than reimplemented — a progress
 * screen with its own count of workouts is a second answer to a question the
 * dashboard already answers, and the two would disagree eventually.
 */
export type ProgressOverview = {
  today: DayKey;
  timeZone: string;

  /** One entry per metric that has at least one measurement, in reading order. */
  series: MetricSeries[];

  /** Daily training buckets in the reader's own zone, oldest first. */
  training: DayActivity[];
  streak: Streak;
  totals: Totals;
  /** False when the runner's log is unreachable — the screen says so. */
  trainingAvailable: boolean;

  /** The newest photo of each pose, for the strip at the bottom. */
  photos: PhotoView[];

  /** False when migration 0014 has not been applied — the screen says so. */
  available: boolean;
};
