"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { setLogs, workoutSessions } from "@/db/schema/runner";
import { getProfile, getUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import type {
  FinishSessionResult,
  LogSetResult,
  StartSessionResult,
} from "./types";

/**
 * Writing down what actually happened during a workout.
 *
 * Server Actions are reachable by a direct POST, not only through our UI, so
 * each one re-checks the session and re-checks that the row belongs to the
 * caller. Drizzle connects as `postgres` and bypasses RLS — the policies in
 * migration 0010 guard the PostgREST surface, not this path.
 *
 * Failures are returned, never thrown. A set that would not save must not take
 * the workout down with it: the runner shows a quiet marker and keeps going,
 * and the totals are recomputed from whatever did land when the session is
 * closed out.
 */

const startSchema = z.object({
  workoutRef: z.string().trim().min(1).max(120),
  workoutTitle: z.string().trim().max(200).default(""),
  totalSets: z.number().int().min(0).max(500),
});

const METRIC_KEYS = [
  "weight",
  "incline",
  "speed",
  "pace",
  "distance",
  "power",
  "level",
  "height",
  "resistance",
] as const;

const logSchema = z.object({
  sessionId: z.uuid(),
  stepKey: z.string().trim().min(1).max(160),
  exerciseId: z.uuid().nullable(),
  exerciseTitle: z.string().trim().max(200).default(""),
  section: z.string().trim().max(40).default("main"),
  round: z.number().int().min(1).max(99),
  position: z.number().int().min(0).max(99),
  mode: z.enum(["reps", "time"]),
  reps: z.number().int().min(0).max(999).nullable(),
  durationSec: z.number().int().min(0).max(7200).nullable(),
  weight: z.number().min(0).max(9999).nullable(),
  // partialRecord, not record: a plain enum-keyed record in zod 4 demands
  // every key, and a set only carries the metrics its equipment asks for.
  metrics: z
    .partialRecord(z.enum(METRIC_KEYS), z.number().min(0).max(99999))
    .nullable(),
  rpe: z.number().int().min(1).max(10).nullable(),
  skipped: z.boolean(),
});

const finishSchema = z.object({
  sessionId: z.uuid(),
  elapsedSec: z.number().int().min(0).max(86400),
  rpe: z.number().int().min(1).max(10).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

/** Postgres 42P01: the table is not there — migration 0010 has not been run. */
function isMissingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

/** Postgres 23505 — the partial unique index on one live session per workout. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/**
 * Totals are derived from the rows, not incremented as they arrive. A set
 * logged twice — a double tap, a retry after a flaky response — must not count
 * twice, and after `onConflictDoUpdate` the row count is the only honest
 * source. One statement, so it cannot half-apply.
 */
async function recomputeTotals(sessionId: string) {
  await db.execute(sql`
    update workout_sessions s
       set completed_sets = agg.done,
           total_volume   = agg.volume
      from (
        select
          count(*) filter (where not skipped) as done,
          coalesce(sum(
            case when skipped then 0
                 else coalesce(reps, 0) * coalesce(weight, 0)
            end
          ), 0) as volume
        from set_logs
        where session_id = ${sessionId}
      ) agg
     where s.id = ${sessionId}
  `);
}

/**
 * Opens a session, or hands back the one already open for this workout.
 *
 * Resuming rather than starting fresh is what makes a locked phone or a
 * reloaded tab harmless: the sets already written down come back with it.
 */
export async function startRunnerSession(
  input: z.input<typeof startSchema>,
): Promise<StartSessionResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "unauthenticated" };

  // The same check the page made. A direct POST does not go through the page.
  const access = await getAccess(await getProfile());
  if (!access.active) return { ok: false, code: "unauthenticated" };

  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const { workoutRef, workoutTitle, totalSets } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: workoutSessions.id, startedAt: workoutSessions.startedAt })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, user.id),
          eq(workoutSessions.workoutRef, workoutRef),
          eq(workoutSessions.status, "in_progress"),
        ),
      )
      .limit(1);

    if (existing) {
      // The plan may have gained or lost a set since this session opened.
      await db
        .update(workoutSessions)
        .set({ totalSets, workoutTitle })
        .where(eq(workoutSessions.id, existing.id));

      const logged = await db
        .select({ stepKey: setLogs.stepKey })
        .from(setLogs)
        .where(eq(setLogs.sessionId, existing.id));

      return {
        ok: true,
        session: {
          id: existing.id,
          startedAt: existing.startedAt.toISOString(),
          loggedKeys: logged.map((row) => row.stepKey),
        },
      };
    }

    const [created] = await db
      .insert(workoutSessions)
      .values({ userId: user.id, workoutRef, workoutTitle, totalSets })
      .returning({
        id: workoutSessions.id,
        startedAt: workoutSessions.startedAt,
      });

    return {
      ok: true,
      session: {
        id: created.id,
        startedAt: created.startedAt.toISOString(),
        loggedKeys: [],
      },
    };
  } catch (error) {
    if (isMissingTable(error)) {
      console.error("[runner] migration 0010 has not been applied");
      return { ok: false, code: "unavailable" };
    }
    // Two tabs hit Start at the same moment; the index did its job.
    if (isUniqueViolation(error)) {
      const [existing] = await db
        .select({ id: workoutSessions.id, startedAt: workoutSessions.startedAt })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, user.id),
            eq(workoutSessions.workoutRef, workoutRef),
            eq(workoutSessions.status, "in_progress"),
          ),
        )
        .limit(1);

      if (existing) {
        return {
          ok: true,
          session: {
            id: existing.id,
            startedAt: existing.startedAt.toISOString(),
            loggedKeys: [],
          },
        };
      }
    }

    console.error("[runner] could not start a session:", error);
    return { ok: false, code: "unavailable" };
  }
}

/** Ownership check shared by every write past the first. */
async function ownsSession(sessionId: string, userId: string) {
  const [row] = await db
    .select({ id: workoutSessions.id, status: workoutSessions.status })
    .from(workoutSessions)
    .where(
      and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)),
    )
    .limit(1);

  return row ?? null;
}

export async function logRunnerSet(
  input: z.input<typeof logSchema>,
): Promise<LogSetResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "unauthenticated" };

  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const data = parsed.data;

  try {
    const session = await ownsSession(data.sessionId, user.id);
    if (!session) return { ok: false, code: "not_found" };

    const row = {
      sessionId: data.sessionId,
      stepKey: data.stepKey,
      exerciseId: data.exerciseId,
      exerciseTitle: data.exerciseTitle,
      section: data.section,
      round: data.round,
      position: data.position,
      mode: data.mode,
      reps: data.reps,
      durationSec: data.durationSec,
      // numeric wants a string; passing a JS number goes through the driver as
      // a float and rounds 82.5 into something with a tail.
      weight: data.weight === null ? null : data.weight.toFixed(2),
      metrics: (data.metrics ?? {}) as Record<string, number>,
      rpe: data.rpe,
      skipped: data.skipped,
    };

    await db
      .insert(setLogs)
      .values(row)
      .onConflictDoUpdate({
        target: [setLogs.sessionId, setLogs.stepKey],
        set: {
          reps: row.reps,
          durationSec: row.durationSec,
          weight: row.weight,
          metrics: row.metrics,
          rpe: row.rpe,
          skipped: row.skipped,
          loggedAt: new Date(),
        },
      });

    await recomputeTotals(data.sessionId);

    return { ok: true };
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, code: "unavailable" };
    console.error("[runner] could not log a set:", error);
    return { ok: false, code: "unavailable" };
  }
}

export async function finishRunnerSession(
  input: z.input<typeof finishSchema>,
): Promise<FinishSessionResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "unauthenticated" };

  const parsed = finishSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const { sessionId, elapsedSec, rpe, notes } = parsed.data;

  try {
    const session = await ownsSession(sessionId, user.id);
    if (!session) return { ok: false, code: "not_found" };

    await recomputeTotals(sessionId);

    const [updated] = await db
      .update(workoutSessions)
      .set({
        status: "completed",
        finishedAt: new Date(),
        elapsedSec,
        rpe,
        notes,
      })
      .where(eq(workoutSessions.id, sessionId))
      .returning({
        completedSets: workoutSessions.completedSets,
        totalVolume: workoutSessions.totalVolume,
      });

    return {
      ok: true,
      completedSets: updated?.completedSets ?? 0,
      totalVolume: Number(updated?.totalVolume ?? 0),
    };
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, code: "unavailable" };
    console.error("[runner] could not finish a session:", error);
    return { ok: false, code: "unavailable" };
  }
}

/**
 * Leaving mid-workout.
 *
 * A session with sets in it stays `in_progress` — that is what makes the
 * workout resumable, and the roadmap promises exactly that in the quit dialog.
 * A session with nothing in it is marked abandoned instead, so an accidental
 * Start does not sit there forever holding the one-live-session index and
 * greeting the user with "resume at set 1" next week.
 */
export async function quitRunnerSession(input: {
  sessionId: string;
  elapsedSec: number;
}): Promise<LogSetResult> {
  const user = await getUser();
  if (!user) return { ok: false, code: "unauthenticated" };

  const parsed = z
    .object({ sessionId: z.uuid(), elapsedSec: z.number().int().min(0).max(86400) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const { sessionId, elapsedSec } = parsed.data;

  try {
    const session = await ownsSession(sessionId, user.id);
    if (!session) return { ok: false, code: "not_found" };

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(setLogs)
      .where(eq(setLogs.sessionId, sessionId));

    await db
      .update(workoutSessions)
      .set(
        count > 0
          ? { elapsedSec }
          : { status: "abandoned", finishedAt: new Date(), elapsedSec },
      )
      .where(eq(workoutSessions.id, sessionId));

    return { ok: true };
  } catch (error) {
    if (isMissingTable(error)) return { ok: false, code: "unavailable" };
    console.error("[runner] could not close a session:", error);
    return { ok: false, code: "unavailable" };
  }
}
