import { daysBetween, shiftDay, type DayKey } from "@/lib/clients/schedule";
import { startOfWeek } from "@/lib/dashboard/days";
import type { DayActivity } from "@/lib/dashboard/types";

/**
 * The arithmetic behind the charts.
 *
 * Pure and free of JSX so the numbers can be reasoned about — and, if it ever
 * matters, tested — without rendering anything. The components in
 * `components/progress/` turn what comes out of here into `<path>` and
 * `<rect>` and nothing else.
 *
 * There is no chart library. The three charts on this screen are a line, a
 * column and a grid of squares; a dependency for that would be more code in
 * the bundle than the charts are, would arrive with its own idea of colour and
 * type, and would be one more thing that has to agree with the design tokens.
 * The awkward part of drawing a chart by hand is picking axis values a human
 * would have picked, and that is `niceScale` below.
 */

/* -------------------------------------------------------------------- axis */

export type Scale = {
  min: number;
  max: number;
  step: number;
  /** Values to label the axis with, low to high. */
  ticks: number[];
};

const STEPS = [1, 2, 2.5, 5, 10];

/**
 * An axis a person would have drawn.
 *
 * Round numbers, a little air above and below the data, and never a flat line
 * pinned to the top of the box. The alternative — min and max straight off the
 * data — produces axes labelled 81.3 and 84.7, which is technically the range
 * and reads as noise.
 *
 * A series whose values are all identical still gets a band around it, because
 * "your weight has not moved" is a real and interesting shape, and a chart
 * that divides by zero to say it is not.
 */
export function niceScale(values: number[], targetTicks = 4): Scale {
  if (values.length === 0) return { min: 0, max: 1, step: 1, ticks: [0, 1] };

  const low = Math.min(...values);
  const high = Math.max(...values);
  const spread = high - low;

  // Flat, or as good as: give it a band wide enough to see the line sit in.
  const padded = spread > 0 ? spread * 0.15 : Math.max(Math.abs(high) * 0.05, 1);
  const from = low - padded;
  const to = high + padded;

  const rough = (to - from) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = (STEPS.find((s) => s * magnitude >= rough) ?? 10) * magnitude;

  const min = Math.floor(from / step) * step;
  const max = Math.ceil(to / step) * step;

  const ticks: number[] = [];
  // Counting rather than accumulating: repeated `+= 0.1` drifts, and a tick
  // labelled 82.30000000000001 is the drift made visible.
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i += 1) ticks.push(round(min + i * step));

  return { min, max, step, ticks };
}

/** Floating-point tidy-up. Ticks are display values, not accumulators. */
function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/* --------------------------------------------------------------- line chart */

export type Box = {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
};

export type PlotPoint = {
  day: DayKey;
  value: number;
  x: number;
  y: number;
};

/**
 * Where each measurement sits inside the SVG box.
 *
 * x is spaced by *date*, not by index. Three weigh-ins in one week and then
 * nothing for two months is a shape worth seeing; evenly spaced points would
 * draw it as a steady march and quietly rewrite what happened.
 *
 * A single point lands in the middle of the box rather than at x=0, where it
 * would read as the start of a line that has not been drawn yet.
 */
export function plot(
  points: { day: DayKey; value: number }[],
  scale: Scale,
  box: Box,
): PlotPoint[] {
  if (points.length === 0) return [];

  const innerW = box.width - box.padLeft - box.padRight;
  const innerH = box.height - box.padTop - box.padBottom;

  const first = points[0].day;
  const span = daysBetween(first, points[points.length - 1].day);
  const range = scale.max - scale.min || 1;

  return points.map((point) => {
    const t = span > 0 ? daysBetween(first, point.day) / span : 0.5;
    const v = (point.value - scale.min) / range;

    return {
      ...point,
      x: box.padLeft + t * innerW,
      // SVG y grows downward; a chart does not.
      y: box.padTop + (1 - v) * innerH,
    };
  });
}

/** `M x y L x y …`. Straight segments — a smoothed curve would invent readings. */
export function linePath(points: PlotPoint[]): string {
  if (points.length === 0) return "";

  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`)
    .join(" ");
}

/** The same line closed against the bottom of the box, for the soft fill. */
export function areaPath(points: PlotPoint[], box: Box): string {
  if (points.length < 2) return "";

  const floor = box.height - box.padBottom;
  const start = points[0];
  const end = points[points.length - 1];

  return `${linePath(points)} L${fmt(end.x)} ${fmt(floor)} L${fmt(start.x)} ${fmt(
    floor,
  )} Z`;
}

export function tickY(value: number, scale: Scale, box: Box): number {
  const innerH = box.height - box.padTop - box.padBottom;
  const range = scale.max - scale.min || 1;
  return box.padTop + (1 - (value - scale.min) / range) * innerH;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/* ------------------------------------------------------------ training bars */

export type WeekBucket = {
  /** Monday of the week, as the key the bar is labelled and sorted by. */
  start: DayKey;
  sessions: number;
  volume: number;
  seconds: number;
};

/**
 * Training rolled up by week, ending with the week `today` is in.
 *
 * Weekly rather than daily because the question the chart answers is "am I
 * still training as much as I was", and a daily column chart answers it with a
 * comb of gaps — most people do not train on most days, and that is not a
 * decline. Empty weeks are kept as zero-height bars: a week with no training
 * is exactly the information somebody is scanning for, and dropping it would
 * make the gap disappear.
 */
export function bucketWeeks(
  days: DayActivity[],
  today: DayKey,
  weeks: number,
): WeekBucket[] {
  const buckets = new Map<DayKey, WeekBucket>();
  const thisWeek = startOfWeek(today);

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = shiftDay(thisWeek, -7 * i);
    buckets.set(start, { start, sessions: 0, volume: 0, seconds: 0 });
  }

  for (const day of days) {
    const bucket = buckets.get(startOfWeek(day.day));
    if (!bucket) continue;

    bucket.sessions += day.sessions;
    bucket.volume += day.volume;
    bucket.seconds += day.seconds;
  }

  return [...buckets.values()];
}

/* ---------------------------------------------------------------- heat grid */

export type HeatCell = {
  day: DayKey;
  sessions: number;
  /** 0 to 3. Four steps, because the eye cannot rank more than that at 10px. */
  level: 0 | 1 | 2 | 3;
  /** Days after today inside the current week — drawn as holes, not as zeros. */
  future: boolean;
};

/**
 * A year of days as columns of weeks, Monday at the top.
 *
 * This is the streak made visible: the number says "nine days", the grid says
 * which nine, and which forty before them were empty. Levels are absolute —
 * one session, two, three or more — rather than relative to the reader's own
 * best week, because a scale that rescales itself makes an easy week look like
 * a hard one the moment the hard ones stop.
 */
export function heatGrid(
  days: DayActivity[],
  today: DayKey,
  weeks: number,
): HeatCell[][] {
  const counts = new Map<DayKey, number>(
    days.map((day) => [day.day, day.sessions]),
  );

  const firstColumn = shiftDay(startOfWeek(today), -7 * (weeks - 1));

  return Array.from({ length: weeks }, (_, column) =>
    Array.from({ length: 7 }, (_, row) => {
      const day = shiftDay(firstColumn, column * 7 + row);
      const sessions = counts.get(day) ?? 0;

      return {
        day,
        sessions,
        level: sessions === 0 ? 0 : sessions === 1 ? 1 : sessions === 2 ? 2 : 3,
        future: day > today,
      } satisfies HeatCell;
    }),
  );
}
