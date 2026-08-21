"use server";

import { sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/db/client";
import { translate } from "@/db/schema/i18n";
import { getProfile, getUser } from "@/lib/auth/session";
import { loadProgramGrid } from "@/lib/clients/queries";
import {
  dayKeyOf,
  isValidDayKey,
  type DayKey,
  type ProgramGrid,
} from "@/lib/clients/schedule";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

import { canMove, planSlotFor, type MoveIndex } from "./moves";
import { loadLiveAssignment, loadMoveIndex, loadTrainedDays } from "./queries";
import type { PlanErrorCode, PlanState } from "./types";

/**
 * The three things a client may do to their own plan.
 *
 * The line this file sits on is the one migration 0012 drew: the plan is the
 * trainer's, the week around it is the client's. So there is no action here
 * that changes which program someone is on, which workout a day holds, or when
 * the plan starts — only which day of their own week a session lands on, and
 * whether it is down as done.
 *
 * Server Actions are reachable by a direct POST rather than only through our
 * forms, so every rule the screen appears to enforce is re-checked here. The
 * screen offers a plain date field precisely so that the legal-target rule
 * lives in `canMove()` alone instead of being written twice and drifting.
 *
 * Drizzle connects as `postgres` and bypasses RLS: the policies in migration
 * 0013 protect these tables from PostgREST, not from this file.
 */

function fail(code: PlanErrorCode): PlanState {
  return { status: "error", code };
}

const SAVED: PlanState = { status: "saved" };

/**
 * Drizzle wraps driver errors, so `error.code` on the thrown object is never
 * the SQLSTATE — the real `PostgresError` hangs off `cause`. Same walk as
 * `lib/workouts/actions.ts`; repeated rather than shared because a
 * `"use server"` module may only export async functions.
 */
function pgErrorCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current !== "object") return undefined;
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function readDay(formData: FormData, field: string): DayKey | null {
  const value = formData.get(field);
  return isValidDayKey(value) ? value : null;
}

/**
 * Everything an action needs before it can decide anything: who is asking,
 * which day it is where they are standing, and the plan as it currently reads.
 */
type Context = {
  userId: string;
  locale: string;
  timeZone: string;
  today: DayKey;
  assignmentId: string;
  startDate: DayKey;
  grid: ProgramGrid;
  moves: MoveIndex;
};

async function context(): Promise<Context | PlanState> {
  const user = await getUser();
  if (!user) return fail("unauthenticated");

  const profile = await getProfile();
  const timeZone = await getTimeZone();
  const today = dayKeyOf(new Date(), timeZone);

  const assignment = await loadLiveAssignment(user.id);
  if (!assignment) return fail("no_plan");

  const [grid, moves] = await Promise.all([
    loadProgramGrid(assignment.programId),
    loadMoveIndex(assignment.id),
  ]);

  if (!grid) return fail("no_plan");

  return {
    userId: user.id,
    locale: profile?.locale ?? defaultLocale,
    timeZone,
    today,
    assignmentId: assignment.id,
    startDate: assignment.startDate,
    grid,
    moves,
  };
}

function isState(value: Context | PlanState): value is PlanState {
  return "status" in value;
}

/* -------------------------------------------------------------- mark done */

/**
 * "I trained, just not in here."
 *
 * Writes a real row in `workout_sessions` rather than a flag beside the plan.
 * Everything that counts training — the streak, the week strip, the trainer's
 * schedule column — reads that table, and a completion recorded anywhere else
 * would be a second answer to "did I train on Tuesday". The row carries zero
 * sets, zero volume and zero seconds because that is genuinely all that is
 * known, and `logged_manually` is what lets the app say so out loud.
 *
 * `started_at` is noon of that day in the reader's own zone, built in SQL so
 * the instant lands inside the day it claims — the grouping query buckets with
 * the same `at time zone`, and midnight in a zone ahead of UTC would fall on
 * the day before.
 */
export async function markDayDoneAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const ctx = await context();
  if (isState(ctx)) return ctx;

  const day = readDay(formData, "day");
  if (!day) return fail("invalid_day");
  if (day > ctx.today) return fail("future_day");

  const slot = planSlotFor(ctx.grid, ctx.startDate, ctx.moves, day);
  const ref = slot.plan.workoutSlug;
  if (slot.plan.kind !== "workout" || !ref) return fail("not_movable");

  const locale = isLocale(ctx.locale) ? ctx.locale : defaultLocale;
  const title = translate(slot.plan.workoutTitle, locale) || ref;

  try {
    const rows = await db.execute<{ id: string }>(sql`
      insert into public.workout_sessions
        (user_id, workout_ref, workout_title, status, started_at, finished_at,
         elapsed_sec, completed_sets, total_sets, total_volume, logged_manually)
      select
        ${ctx.userId}::uuid,
        ${ref},
        ${title},
        'completed'::public.workout_session_status,
        ((${day}::date + time '12:00') at time zone ${ctx.timeZone}),
        ((${day}::date + time '12:00') at time zone ${ctx.timeZone}),
        0, 0, 0, 0, true
      where not exists (
        select 1
        from public.workout_sessions s
        where s.user_id = ${ctx.userId}::uuid
          and s.workout_ref = ${ref}
          and s.status = 'completed'
          and (s.started_at at time zone ${ctx.timeZone})::date = ${day}::date
      )
      returning id::text as id
    `);

    // Nothing inserted means the guard matched: the day is already down as
    // trained, by the runner or by an earlier tap on this same button.
    if ([...rows].length === 0) return fail("already_done");
  } catch (error) {
    console.error("markDayDone failed", error);
    return fail("unavailable");
  }

  refresh();
  return SAVED;
}

/**
 * Undo a tick.
 *
 * Scoped to `logged_manually` rows on purpose: a session the runner wrote is a
 * record of something that happened, and no button on the plan screen deletes
 * one. If the day is down as trained because it was trained, the answer is
 * that there is nothing here to undo.
 */
export async function unmarkDayAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const ctx = await context();
  if (isState(ctx)) return ctx;

  const day = readDay(formData, "day");
  if (!day) return fail("invalid_day");

  const slot = planSlotFor(ctx.grid, ctx.startDate, ctx.moves, day);
  const ref = slot.plan.workoutSlug;
  if (!ref) return fail("not_marked");

  try {
    const rows = await db.execute<{ id: string }>(sql`
      delete from public.workout_sessions
      where user_id = ${ctx.userId}::uuid
        and workout_ref = ${ref}
        and status = 'completed'
        and logged_manually = true
        and (started_at at time zone ${ctx.timeZone})::date = ${day}::date
      returning id::text as id
    `);

    if ([...rows].length === 0) return fail("not_marked");
  } catch (error) {
    console.error("unmarkDay failed", error);
    return fail("unavailable");
  }

  refresh();
  return SAVED;
}

/* ------------------------------------------------------------------- move */

/** Whether the plan's workout for `day` is already down as trained. */
async function isDone(ctx: Context, day: DayKey, ref: string): Promise<boolean> {
  try {
    const trained = await loadTrainedDays(ctx.userId, ctx.timeZone, day, day);
    return Boolean(trained.get(day)?.refs.has(ref));
  } catch (error) {
    // The log being unreachable is not a reason to refuse a move — the plan
    // itself is readable, and blocking a rearrangement on a table that is not
    // there would be the wrong end to fail at.
    console.error("isDone: session log unavailable", error);
    return false;
  }
}

/**
 * "This one happens on Sunday instead."
 *
 * Records one exception rather than rewriting the calendar — see
 * `lib/plan/moves.ts` for why the calendar stays derived.
 *
 * The one subtlety is moving a day that was already moved. That day's content
 * arrived from somewhere, so the existing row is re-pointed instead of a
 * second one being written: chains would have to be resolved on every read,
 * and "Friday to Sunday to Monday" is not a thing anyone means — they mean
 * Friday happens on Monday.
 */
export async function moveDayAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const ctx = await context();
  if (isState(ctx)) return ctx;

  const day = readDay(formData, "day");
  const toDay = readDay(formData, "toDay");
  if (!day || !toDay) return fail("invalid_day");

  // A day in the past cannot be planned. Moving a missed session forward is
  // the normal case and stays allowed; moving one backwards onto a day that
  // has already happened would only be a way of claiming it retroactively,
  // and there is a button for that.
  if (toDay < ctx.today) return fail("target_past");

  const check = canMove(ctx.grid, ctx.startDate, ctx.moves, day, toDay);
  if (!check.ok) return fail(check.reason);

  const slot = planSlotFor(ctx.grid, ctx.startDate, ctx.moves, day);
  const ref = slot.plan.workoutSlug;
  if (!ref) return fail("not_movable");

  if (await isDone(ctx, day, ref)) return fail("already_done");

  // Where the session started life, before any of this client's moves.
  const origin = ctx.moves.byTo.get(day) ?? day;

  try {
    await db.execute(sql`
      insert into public.plan_day_moves (assignment_id, user_id, from_day, to_day)
      values (
        ${ctx.assignmentId}::uuid,
        ${ctx.userId}::uuid,
        ${origin}::date,
        ${toDay}::date
      )
      on conflict (assignment_id, from_day)
      do update set to_day = excluded.to_day
    `);
  } catch (error) {
    // The other unique index — two sessions cannot share a landing day. The
    // overlay already rejects a busy target, so this is the race between two
    // tabs rather than a rule the screen failed to show.
    if (pgErrorCode(error) === "23505") return fail("target_busy");

    console.error("moveDay failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

/**
 * Put a moved session back where the program put it.
 *
 * Takes either end of the move, because both are places the reader might be
 * looking from: the day the session sits on now, and the day it left.
 */
export async function undoMoveAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const ctx = await context();
  if (isState(ctx)) return ctx;

  const day = readDay(formData, "day");
  if (!day) return fail("invalid_day");

  const slot = planSlotFor(ctx.grid, ctx.startDate, ctx.moves, day);
  const ref = slot.plan.workoutSlug;

  // Undoing after the session was trained would leave a completed workout on a
  // day the plan no longer puts it on, which reads as a missed day plus a
  // stray session. Both statements would be true and the pair would be a lie.
  if (ref && (await isDone(ctx, day, ref))) return fail("already_done");

  try {
    const rows = await db.execute<{ id: string }>(sql`
      delete from public.plan_day_moves
      where assignment_id = ${ctx.assignmentId}::uuid
        and (to_day = ${day}::date or from_day = ${day}::date)
      returning id::text as id
    `);

    if ([...rows].length === 0) return fail("not_movable");
  } catch (error) {
    console.error("undoMove failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}
