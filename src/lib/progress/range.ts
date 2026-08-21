import { shiftDay, type DayKey } from "@/lib/clients/schedule";

import type { MetricSeries } from "./types";

/**
 * How far back the chart looks.
 *
 * A slice of what is already loaded rather than a second query: the whole
 * history of one person's measurements is a few hundred rows, so narrowing the
 * window on the server would be a round trip to hide data the page already
 * holds. See `lib/progress/queries.loadSeries`.
 *
 * Pure and free of `server-only`, so the same slice can be taken on either
 * side if the chart ever gains a control that does not go through the URL.
 */

export const RANGE_KEYS = ["d90", "d180", "d365", "all"] as const;

export type RangeKey = (typeof RANGE_KEYS)[number];

export const DEFAULT_RANGE: RangeKey = "d180";

const DAYS: Record<RangeKey, number | null> = {
  d90: 90,
  d180: 180,
  d365: 365,
  all: null,
};

export function isRangeKey(value: unknown): value is RangeKey {
  return (
    typeof value === "string" && (RANGE_KEYS as readonly string[]).includes(value)
  );
}

/**
 * The series narrowed to the window, with its summary recomputed.
 *
 * `first` and `change` are recomputed against the *visible* points on purpose:
 * a chart captioned "down 6 kg since March" while the axis starts in June is
 * two claims that do not match, and the reader will believe the caption.
 */
export function sliceSeries(
  series: MetricSeries,
  today: DayKey,
  range: RangeKey,
): MetricSeries {
  const days = DAYS[range];
  if (days === null) return series;

  const from = shiftDay(today, -(days - 1));
  const points = series.points.filter((point) => point.day >= from);

  if (points.length === 0) {
    return { ...series, points, first: null, latest: null, change: null };
  }

  const first = points[0];
  const latest = points[points.length - 1];

  return {
    ...series,
    points,
    first,
    latest,
    change: points.length > 1 ? latest.value - first.value : null,
  };
}
