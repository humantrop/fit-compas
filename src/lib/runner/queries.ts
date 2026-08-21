import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { setLogs, workoutSessions } from "@/db/schema/runner";

import type { RunnerSessionState } from "./types";

/**
 * Reads for the runner. Every one of them degrades instead of throwing.
 *
 * The log lives in tables created by `supabase/migrations/0010_workout_runner.sql`,
 * which is applied by hand in the SQL editor like every other migration in
 * that folder. On a database where it has not been run yet, a workout that
 * refuses to open is a worse outcome than a workout that runs unrecorded — so
 * a failed read returns "no session, logging unavailable" and the runner says
 * so in the UI.
 */

export const NO_SESSION: RunnerSessionState = {
  id: null,
  startedAt: null,
  loggedKeys: [],
};

/** The open session for this workout, if the user left one running. */
export async function loadActiveSession(
  userId: string,
  workoutRef: string,
): Promise<{ state: RunnerSessionState; loggingAvailable: boolean }> {
  try {
    const [session] = await db
      .select({
        id: workoutSessions.id,
        startedAt: workoutSessions.startedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.workoutRef, workoutRef),
          eq(workoutSessions.status, "in_progress"),
        ),
      )
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);

    if (!session) {
      return { state: NO_SESSION, loggingAvailable: true };
    }

    const logged = await db
      .select({ stepKey: setLogs.stepKey })
      .from(setLogs)
      .where(eq(setLogs.sessionId, session.id));

    return {
      state: {
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        loggedKeys: logged.map((row) => row.stepKey),
      },
      loggingAvailable: true,
    };
  } catch (error) {
    console.error("[runner] session log unavailable:", error);
    return { state: NO_SESSION, loggingAvailable: false };
  }
}

export type SessionHistoryRow = {
  id: string;
  workoutRef: string;
  workoutTitle: string;
  startedAt: string;
  elapsedSec: number;
  completedSets: number;
  totalSets: number;
  totalVolume: number;
};

/**
 * Finished sessions, newest first. The list screen shows the last few; the
 * progress charts in feature 14 read the same table properly.
 */
export async function listRecentSessions(
  userId: string,
  limit = 5,
): Promise<SessionHistoryRow[]> {
  try {
    const rows = await db
      .select({
        id: workoutSessions.id,
        workoutRef: workoutSessions.workoutRef,
        workoutTitle: workoutSessions.workoutTitle,
        startedAt: workoutSessions.startedAt,
        elapsedSec: workoutSessions.elapsedSec,
        completedSets: workoutSessions.completedSets,
        totalSets: workoutSessions.totalSets,
        totalVolume: workoutSessions.totalVolume,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.status, "completed"),
        ),
      )
      .orderBy(desc(workoutSessions.startedAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      startedAt: row.startedAt.toISOString(),
      // numeric comes back as a string from postgres.js — it is arbitrary
      // precision and does not fit a JS number in the general case. Volumes
      // do, so the boundary is here rather than all the way up in the UI.
      totalVolume: Number(row.totalVolume ?? 0),
    }));
  } catch (error) {
    console.error("[runner] history unavailable:", error);
    return [];
  }
}
