import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { BodyMetric } from "@/db/schema/progress";
import type { DayKey } from "@/lib/clients/schedule";
import { loadDashboardStats } from "@/lib/dashboard/queries";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { METRIC_ORDER, isBodyMetric } from "./metrics";
import {
  PHOTO_URL_TTL_SECONDS,
  PROGRESS_PHOTO_BUCKET,
  isPhotoPose,
} from "./photos";
import type {
  MeasurementEntry,
  MeasurementPoint,
  MetricSeries,
  PhotoView,
  ProgressOverview,
} from "./types";

/**
 * Everything the progress screens read.
 *
 * Two sources, deliberately kept apart. The body half comes from
 * `body_measurements`, which only this feature writes. The training half —
 * the streak, the weekly columns, the totals — comes from
 * `loadDashboardStats`, the dashboard's own reader over `workout_sessions`.
 * It is called rather than reimplemented: a progress screen that counted
 * workouts itself would be a second answer to a question the dashboard already
 * answers, and the two would agree right up until the week somebody checked.
 *
 * Every read degrades instead of throwing, the same arrangement
 * `lib/dashboard/queries.ts` and `lib/plan/queries.ts` have. On a database
 * where migration 0014 has not been applied, the useful outcome is a screen
 * that says the log is unreachable, not a 500 behind the Progress tab.
 * `available: false` is how the screen tells "nothing measured yet" apart from
 * "cannot read it".
 *
 * Drizzle connects as `postgres` and bypasses RLS, so the policies in 0014
 * protect these tables from PostgREST, not from this file: every query below
 * filters on `user_id` itself.
 */

/**
 * `numeric` arrives from postgres.js as a string, because arbitrary precision
 * does not fit a JS number in the general case. Casting to text in the query
 * and converting here means the value arrives as a string on every path rather
 * than as a number on some of them — the same reasoning as `sum(total_volume)`
 * in the dashboard's reader.
 */
function num(value: string | null): number {
  return Number(value ?? 0);
}

/* ---------------------------------------------------------- measurements */

/**
 * Every measurement the reader has, oldest first, grouped by metric.
 *
 * The whole history rather than a window: one person logging a weight a week
 * for five years is 260 rows, and the chart's own range control is a client-
 * side slice of what is already here. Paging this would buy nothing and would
 * put the "since you started" number out of reach.
 */
export async function loadSeries(userId: string): Promise<MetricSeries[]> {
  const rows = await db.execute<{
    metric: string;
    taken_on: string;
    value: string;
  }>(sql`
    select
      metric::text       as metric,
      taken_on::text     as taken_on,
      value::text        as value
    from public.body_measurements
    where user_id = ${userId}::uuid
    order by taken_on asc
  `);

  const byMetric = new Map<BodyMetric, MeasurementPoint[]>();

  for (const row of rows) {
    if (!isBodyMetric(row.metric)) continue;

    const points = byMetric.get(row.metric) ?? [];
    points.push({ day: row.taken_on, value: num(row.value) });
    byMetric.set(row.metric, points);
  }

  // Reading order comes from METRIC_ORDER, not from the database: the metrics
  // are shown down the body, and `order by metric` would show them in whatever
  // order the enum happens to be declared in.
  return METRIC_ORDER.flatMap((metric) => {
    const points = byMetric.get(metric);
    if (!points || points.length === 0) return [];

    const first = points[0];
    const latest = points[points.length - 1];

    return [
      {
        metric,
        points,
        first,
        latest,
        change: points.length > 1 ? latest.value - first.value : null,
      } satisfies MetricSeries,
    ];
  });
}

/**
 * The history table: newest first, each row carrying the value before it.
 *
 * `lag` runs over the full history inside the subquery and the limit is
 * applied outside it. Limiting first would compute each row's "previous"
 * against the page it landed on, so the oldest row of every page would show no
 * change at all — a chart of the paging rather than of the body.
 */
export async function loadEntries(
  userId: string,
  limit = 200,
): Promise<MeasurementEntry[]> {
  const rows = await db.execute<{
    metric: string;
    taken_on: string;
    value: string;
    previous: string | null;
  }>(sql`
    select metric, taken_on, value, previous
    from (
      select
        metric::text   as metric,
        taken_on::text as taken_on,
        value::text    as value,
        (lag(value) over (partition by metric order by taken_on))::text as previous
      from public.body_measurements
      where user_id = ${userId}::uuid
    ) history
    order by taken_on desc, metric asc
    limit ${limit}
  `);

  return [...rows].flatMap((row) =>
    isBodyMetric(row.metric)
      ? [
          {
            metric: row.metric,
            day: row.taken_on,
            value: num(row.value),
            previous: row.previous === null ? null : num(row.previous),
          },
        ]
      : [],
  );
}

/* ---------------------------------------------------------------- photos */

type PhotoRow = {
  id: string;
  taken_on: string;
  pose: string;
  storage_path: string;
  width: number | null;
  height: number | null;
};

/**
 * Signed URLs for a batch of objects.
 *
 * The bucket is private — migration 0001 made it so, and the storage policies
 * on it only ever grant a client their own `{user_id}/…` prefix. These URLs
 * are minted with the service-role key, which bypasses all of that, so the
 * caller has already had to establish whose photos these are. Every caller
 * here reached the rows through a `user_id` filter of its own.
 *
 * One round trip for the whole gallery rather than one per photo, and a URL
 * that fails to sign comes back null rather than taking the screen with it.
 */
async function signPhotos(rows: PhotoRow[]): Promise<PhotoView[]> {
  // Path and view are carried together rather than zipped by index afterwards:
  // a row with an unrecognised pose drops out here, and an index-based join
  // would then hand every photo after it somebody else's URL.
  const entries = rows.flatMap((row) =>
    isPhotoPose(row.pose)
      ? [
          {
            path: row.storage_path,
            view: {
              id: row.id,
              takenOn: row.taken_on,
              pose: row.pose,
              url: null,
              width: row.width,
              height: row.height,
            } satisfies PhotoView,
          },
        ]
      : [],
  );

  if (entries.length === 0) return [];

  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.storage
      .from(PROGRESS_PHOTO_BUCKET)
      .createSignedUrls(
        entries.map((entry) => entry.path),
        PHOTO_URL_TTL_SECONDS,
      );

    // One result per requested path, each carrying its own error: a single
    // missing object must not blank the gallery.
    const signed = new Map(
      (data ?? []).flatMap((entry) =>
        entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : [],
      ),
    );

    return entries.map((entry) => ({
      ...entry.view,
      url: signed.get(entry.path) ?? null,
    }));
  } catch (error) {
    console.error("[progress] could not sign photo URLs:", error);
    return entries.map((entry) => entry.view);
  }
}

export async function loadPhotos(userId: string): Promise<PhotoView[]> {
  const rows = await db.execute<PhotoRow>(sql`
    select
      id::text           as id,
      taken_on::text     as taken_on,
      pose::text         as pose,
      storage_path       as storage_path,
      width              as width,
      height             as height
    from public.progress_photos
    where user_id = ${userId}::uuid
    order by taken_on desc, pose asc
  `);

  return signPhotos([...rows]);
}

/** The newest photo of each pose — the strip on the overview. */
async function loadLatestPhotos(userId: string): Promise<PhotoView[]> {
  const rows = await db.execute<PhotoRow>(sql`
    select distinct on (pose)
      id::text       as id,
      taken_on::text as taken_on,
      pose::text     as pose,
      storage_path   as storage_path,
      width          as width,
      height         as height
    from public.progress_photos
    where user_id = ${userId}::uuid
    order by pose asc, taken_on desc
  `);

  return signPhotos([...rows]);
}

/**
 * One photo by id, for the delete action — which has to know the object key
 * before it drops the row that names it.
 */
export async function loadPhotoPath(
  userId: string,
  photoId: string,
): Promise<string | null> {
  const rows = await db.execute<{ storage_path: string }>(sql`
    select storage_path
    from public.progress_photos
    where id = ${photoId}::uuid and user_id = ${userId}::uuid
    limit 1
  `);

  return [...rows][0]?.storage_path ?? null;
}

/* -------------------------------------------------------------- overview */

export async function loadOverview(
  userId: string,
  timeZone: string,
  today: DayKey,
): Promise<ProgressOverview> {
  // The training half is loaded first and on its own: it reads a different
  // migration, and it already degrades to zeros internally. Whether the body
  // half is readable is a separate question with a separate answer on screen.
  const stats = await loadDashboardStats(userId, timeZone, today);

  const base: ProgressOverview = {
    today,
    timeZone,
    series: [],
    training: stats.days,
    streak: stats.streak,
    totals: stats.allTime,
    trainingAvailable: stats.available,
    photos: [],
    available: true,
  };

  try {
    const [series, photos] = await Promise.all([
      loadSeries(userId),
      loadLatestPhotos(userId),
    ]);

    return { ...base, series, photos };
  } catch (error) {
    console.error("[progress] measurements unavailable:", error);
    return { ...base, available: false };
  }
}
