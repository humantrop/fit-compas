import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { workoutSessions } from "@/db/schema/runner";

import { computeStreak, type DayKey } from "./days";
import type { DashboardStats, DayActivity, OpenSession, Totals } from "./types";

/**
 * Everything the dashboard counts, read from the runner's log.
 *
 * No new tables. `workout_sessions` (migration 0010, feature 10) already holds
 * one row per performed workout with its totals computed at finish time, so
 * the dashboard is a grouping over it rather than a second bookkeeping of the
 * same facts — which is how the two end up disagreeing.
 *
 * Every read degrades instead of throwing, same as `lib/runner/queries.ts`: on
 * a database where 0010 has not been applied, a dashboard reporting zero is a
 * better outcome than a 500 on the first screen after login. `available: false`
 * is how the screen tells the two apart.
 */

const EMPTY_TOTALS: Totals = { workouts: 0, sets: 0, volume: 0, seconds: 0 };

/** How far back the day buckets go. Enough for any plausible streak. */
const WINDOW_DAYS = 400;

type DayRow = {
  day: string;
  sessions: number;
  sets: number;
  /** numeric arrives as text from postgres.js — see the cast below. */
  volume: string;
  seconds: number;
};

/**
 * Daily buckets in the reader's own time zone.
 *
 * The bucketing has to happen in SQL, not after the fact in JS: grouping in
 * UTC and relabelling afterwards puts a 01:30 workout on the wrong day, and
 * that is exactly the row a streak hinges on. `timeZone` is a bound parameter,
 * never interpolated, and is shape-checked in `timezone.ts` before it gets
 * here.
 *
 * `sum(total_volume)` is cast to text on purpose. It is `numeric`, which
 * postgres.js hands back as a string because arbitrary precision does not fit
 * a JS number in the general case; making the cast explicit means the value
 * arrives as a string on every path rather than as a number on some of them.
 */
async function loadDays(userId: string, timeZone: string): Promise<DayActivity[]> {
  const rows = await db.execute<DayRow>(sql`
    select
      to_char((started_at at time zone ${timeZone})::date, 'YYYY-MM-DD') as day,
      count(*)::int                                                      as sessions,
      coalesce(sum(completed_sets), 0)::int                              as sets,
      coalesce(sum(total_volume), 0)::text                               as volume,
      coalesce(sum(elapsed_sec), 0)::int                                 as seconds
    from public.workout_sessions
    where user_id = ${userId}::uuid
      and status = 'completed'
      and started_at >= now() - make_interval(days => ${WINDOW_DAYS})
    group by 1
    order by 1
  `);

  return [...rows].map((row) => ({
    day: row.day,
    sessions: Number(row.sessions),
    sets: Number(row.sets),
    volume: Number(row.volume ?? 0),
    seconds: Number(row.seconds),
  }));
}

async function loadAllTime(userId: string): Promise<Totals> {
  const rows = await db.execute<{
    workouts: number;
    sets: number;
    volume: string;
    seconds: number;
  }>(sql`
    select
      count(*)::int                          as workouts,
      coalesce(sum(completed_sets), 0)::int  as sets,
      coalesce(sum(total_volume), 0)::text   as volume,
      coalesce(sum(elapsed_sec), 0)::int     as seconds
    from public.workout_sessions
    where user_id = ${userId}::uuid and status = 'completed'
  `);

  const row = [...rows][0];
  if (!row) return EMPTY_TOTALS;

  return {
    workouts: Number(row.workouts),
    sets: Number(row.sets),
    volume: Number(row.volume ?? 0),
    seconds: Number(row.seconds),
  };
}

/**
 * The workout left running, if there is one.
 *
 * The runner already resumes a session when that workout is reopened, but only
 * if you remember which one it was. Surfacing it here is the difference
 * between an interrupted session and an abandoned one.
 */
async function loadOpenSession(userId: string): Promise<OpenSession | null> {
  const [row] = await db
    .select({
      id: workoutSessions.id,
      workoutRef: workoutSessions.workoutRef,
      workoutTitle: workoutSessions.workoutTitle,
      startedAt: workoutSessions.startedAt,
      completedSets: workoutSessions.completedSets,
      totalSets: workoutSessions.totalSets,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        eq(workoutSessions.status, "in_progress"),
      ),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  if (!row) return null;

  return { ...row, startedAt: row.startedAt.toISOString() };
}

export async function loadDashboardStats(
  userId: string,
  timeZone: string,
  today: DayKey,
): Promise<DashboardStats> {
  try {
    const [days, allTime, open] = await Promise.all([
      loadDays(userId, timeZone),
      loadAllTime(userId),
      loadOpenSession(userId),
    ]);

    return {
      days,
      allTime,
      streak: computeStreak(new Set(days.map((day) => day.day)), today),
      open,
      available: true,
    };
  } catch (error) {
    console.error("[dashboard] session log unavailable:", error);
    return {
      days: [],
      allTime: EMPTY_TOTALS,
      streak: { current: 0, best: 0, activeToday: false },
      open: null,
      available: false,
    };
  }
}

/** Sums a slice of the day buckets — "this week", "last 30 days". */
export function totalsSince(days: DayActivity[], from: DayKey): Totals {
  return days.reduce<Totals>(
    (acc, day) =>
      day.day < from
        ? acc
        : {
            workouts: acc.workouts + day.sessions,
            sets: acc.sets + day.sets,
            volume: acc.volume + day.volume,
            seconds: acc.seconds + day.seconds,
          },
    { ...EMPTY_TOTALS },
  );
}
