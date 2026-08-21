import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { AssignmentStatus } from "@/db/schema/clients";
import type { Translated } from "@/db/schema/i18n";
import { loadProgramGrid } from "@/lib/clients/queries";
import {
  planEnd as planEndOf,
  planProgress,
  type DayKey,
  type ProgramGrid,
} from "@/lib/clients/schedule";

import { indexMoves, planSlots, type Move, type MoveIndex } from "./moves";
import type { PlanDayView, PlanView } from "./types";

/**
 * Everything the client's own plan screen reads.
 *
 * The program grid comes from `lib/clients/queries.loadProgramGrid` and the
 * calendar arithmetic from `lib/clients/schedule` — both written for the
 * trainer's side in feature 12, and reused rather than reimplemented on
 * purpose. Two versions of "what is week 3 day 2" is how a coach and a client
 * end up looking at different weeks, and the difference would only show on the
 * days they disagree, which are exactly the days that matter.
 *
 * What this file adds is the client's own layer: the moves they made, and the
 * sessions they actually logged.
 */

export type LiveAssignment = {
  id: string;
  programId: string;
  programSlug: string;
  programTitle: Translated;
  status: AssignmentStatus;
  startDate: DayKey;
  pausedOn: DayKey | null;
};

/**
 * The plan the client is on, if any.
 *
 * "Live" means active or paused — the same pair the partial unique index in
 * migration 0012 allows at most one of, so this cannot quietly pick between two
 * rows. A completed or cancelled plan is history and belongs on no calendar.
 */
export async function loadLiveAssignment(
  userId: string,
): Promise<LiveAssignment | null> {
  const rows = await db.execute<{
    id: string;
    program_id: string;
    program_slug: string;
    program_title: Translated | null;
    status: AssignmentStatus;
    start_date: string;
    paused_on: string | null;
  }>(sql`
    select
      a.id::text         as id,
      a.program_id::text as program_id,
      pr.slug            as program_slug,
      pr.title           as program_title,
      a.status::text     as status,
      a.start_date::text as start_date,
      a.paused_on::text  as paused_on
    from public.client_assignments a
    join public.programs pr on pr.id = a.program_id
    where a.user_id = ${userId}::uuid
      and a.status in ('active', 'paused')
    order by a.created_at desc
    limit 1
  `);

  const row = [...rows][0];
  if (!row) return null;

  return {
    id: row.id,
    programId: row.program_id,
    programSlug: row.program_slug,
    programTitle: row.program_title ?? {},
    status: row.status,
    startDate: row.start_date,
    pausedOn: row.paused_on,
  };
}

/**
 * Every move on this assignment, not only the ones inside the window.
 *
 * A move reaches into a window from outside it — Friday pushed to the
 * following Monday is invisible to a window that stops on Sunday — and one
 * client has a handful of these, not thousands. Filtering by date here would
 * buy a correctness bug and save nothing.
 */
export async function loadMoves(assignmentId: string): Promise<Move[]> {
  const rows = await db.execute<{ from_day: string; to_day: string }>(sql`
    select from_day::text as from_day, to_day::text as to_day
    from public.plan_day_moves
    where assignment_id = ${assignmentId}::uuid
  `);

  return [...rows].map((row) => ({ fromDay: row.from_day, toDay: row.to_day }));
}

export async function loadMoveIndex(assignmentId: string): Promise<MoveIndex> {
  return indexMoves(await loadMoves(assignmentId));
}

export type TrainedDay = {
  count: number;
  refs: Set<string>;
  /** The subset of `refs` that came from a tick rather than from the runner. */
  manualRefs: Set<string>;
};

/**
 * Which calendar days the client trained on, bucketed in SQL in their zone.
 *
 * Grouping in UTC and relabelling afterwards puts a 23:30 session on tomorrow,
 * and the whole point of this map is lining sessions up against the plan.
 * `timeZone` is a bound parameter, never interpolated, and shape-checked by
 * `lib/dashboard/timezone.isTimeZone` before it gets here.
 */
export async function loadTrainedDays(
  userId: string,
  timeZone: string,
  from: DayKey,
  to: DayKey,
): Promise<Map<DayKey, TrainedDay>> {
  const rows = await db.execute<{
    day: string;
    count: number;
    refs: string[] | null;
    manual_refs: string[] | null;
  }>(sql`
    select
      to_char((started_at at time zone ${timeZone})::date, 'YYYY-MM-DD') as day,
      count(*)::int                                                      as count,
      array_agg(distinct workout_ref)                                    as refs,
      array_remove(
        array_agg(distinct case when logged_manually then workout_ref end),
        null
      )                                                                  as manual_refs
    from public.workout_sessions
    where user_id = ${userId}::uuid
      and status = 'completed'
      and (started_at at time zone ${timeZone})::date
          between ${from}::date and ${to}::date
    group by 1
  `);

  return new Map(
    [...rows].map((row) => [
      row.day,
      {
        count: Number(row.count),
        refs: new Set(row.refs ?? []),
        manualRefs: new Set(row.manual_refs ?? []),
      },
    ]),
  );
}

/** No plan still renders a calendar — it just has nothing on it. */
function emptyView(today: DayKey, timeZone: string): PlanView {
  return {
    program: null,
    assignmentStatus: null,
    startDate: null,
    endDate: null,
    pausedOn: null,
    progress: null,
    today,
    timeZone,
    days: [],
    logAvailable: true,
  };
}

/**
 * The client's plan over `[from, to]`, inclusive.
 *
 * The log read is wrapped on its own: `workout_sessions` arrives in a separate
 * migration, and on a database where it has not been applied the useful
 * failure is a calendar with no ticks on it, not a 500 on the plan screen.
 */
export async function loadPlan(
  userId: string,
  timeZone: string,
  today: DayKey,
  from: DayKey,
  to: DayKey,
): Promise<PlanView> {
  const assignment = await loadLiveAssignment(userId);
  if (!assignment) return emptyView(today, timeZone);

  const [grid, moves] = await Promise.all([
    loadProgramGrid(assignment.programId),
    loadMoveIndex(assignment.id),
  ]);

  if (!grid) return emptyView(today, timeZone);

  let trained = new Map<DayKey, TrainedDay>();
  let logAvailable = true;

  try {
    trained = await loadTrainedDays(userId, timeZone, from, to);
  } catch (error) {
    console.error("[plan] session log unavailable:", error);
    logAvailable = false;
  }

  return {
    program: {
      title: grid.title,
      slug: assignment.programSlug,
      daysPerWeek: grid.daysPerWeek,
      weekCount: grid.weeks.length,
    },
    assignmentStatus: assignment.status,
    startDate: assignment.startDate,
    endDate: planEndOf(grid, assignment.startDate),
    pausedOn: assignment.pausedOn,
    progress: planProgress(grid, assignment.startDate, today),
    today,
    timeZone,
    days: toViews(grid, assignment.startDate, moves, trained, today, from, to),
    logAvailable,
  };
}

function toViews(
  grid: ProgramGrid,
  startDate: DayKey,
  moves: MoveIndex,
  trained: Map<DayKey, TrainedDay>,
  today: DayKey,
  from: DayKey,
  to: DayKey,
): PlanDayView[] {
  return planSlots(grid, startDate, moves, from, to).map((slot) => {
    const log = trained.get(slot.day);
    const slug = slot.plan.workoutSlug;

    return {
      day: slot.day,
      plan: slot.plan,
      movedFrom: slot.movedFrom,
      movedTo: slot.movedTo,
      isToday: slot.day === today,
      isPast: slot.day < today,
      done: log?.count ?? 0,
      // The runner records a workout by slug, so a session on the right day
      // still has to be the right workout to count as the plan being followed.
      // Any other session that day counts as trained — a different, and
      // equally true, thing to say.
      matched: Boolean(slug && log?.refs.has(slug)),
      selfReported: Boolean(slug && log?.manualRefs.has(slug)),
    };
  });
}
