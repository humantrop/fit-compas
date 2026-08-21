"use server";

import { eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import { clientAssignments, clientNotes } from "@/db/schema/clients";
import { getProfile } from "@/lib/auth/session";

import { getAdminTimeZone } from "./queries";
import { dayKeyOf, isValidDayKey, type DayKey } from "./schedule";
import { NOTE_MAX, type ClientErrorCode, type ClientState } from "./types";

/**
 * Every mutation on the People screens.
 *
 * Server Actions are reachable by a direct POST, not only through our UI, so
 * the role check belongs in every one of them. Drizzle connects as `postgres`
 * and bypasses RLS — the policies in migration 0012 protect the tables from
 * PostgREST, not from this file.
 */

function fail(code: ClientErrorCode): ClientState {
  return { status: "error", code };
}

const SAVED: ClientState = { status: "saved" };

async function requireAdminId(): Promise<string | null> {
  const profile = await getProfile();
  return profile?.role === "admin" ? profile.id : null;
}

const uuidSchema = z.string().uuid();

function readId(formData: FormData, field: string): string | null {
  const parsed = uuidSchema.safeParse(formData.get(field));
  return parsed.success ? parsed.data : null;
}

function readDay(formData: FormData, field: string): DayKey | null {
  const value = formData.get(field);
  return isValidDayKey(value) ? value : null;
}

/** The admin's own calendar day — see the note on `getAdminTimeZone`. */
async function today(): Promise<DayKey> {
  return dayKeyOf(new Date(), await getAdminTimeZone());
}

/* ------------------------------------------------------------------ assign */

export async function assignProgramAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const userId = readId(formData, "userId");
  if (!userId) return fail("not_found");

  const programId = readId(formData, "programId");
  if (!programId) return fail("program_missing");

  const startDate = readDay(formData, "startDate");
  if (!startDate) return fail("invalid_date");

  const note = String(formData.get("note") ?? "").trim().slice(0, NOTE_MAX);
  const day = await today();

  try {
    await db.transaction(async (tx) => {
      // Ends whatever plan the client is currently on. `completed` when the
      // last day of that plan has already passed, `cancelled` when it has not —
      // the difference is the whole reason the history list is worth reading
      // later. One statement, so the partial unique index (one live plan per
      // client) holds across the swap.
      await tx.execute(sql`
        update public.client_assignments a
        set status = case
              when ${day}::date > a.start_date + (
                coalesce((
                  select count(*)::int from public.program_weeks w
                  where w.program_id = a.program_id
                ), 0)
                * coalesce((
                  select pr.days_per_week from public.programs pr
                  where pr.id = a.program_id
                ), 0) - 1
              )
              then 'completed'::public.assignment_status
              else 'cancelled'::public.assignment_status
            end,
            ended_on = ${day}::date,
            paused_on = null
        where a.user_id = ${userId}::uuid
          and a.status in ('active', 'paused')
      `);

      await tx.insert(clientAssignments).values({
        userId,
        programId,
        startDate,
        status: "active",
        note: note || null,
        assignedBy: adminId,
      });
    });
  } catch (error) {
    console.error("assignProgram failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

/* ------------------------------------------------------------------ status */

const STATUS_ACTIONS = ["pause", "resume", "complete", "cancel"] as const;
type StatusAction = (typeof STATUS_ACTIONS)[number];

function isStatusAction(value: unknown): value is StatusAction {
  return (STATUS_ACTIONS as readonly unknown[]).includes(value);
}

/**
 * Pause, resume, finish or drop the current plan.
 *
 * Resuming shifts `start_date` forward by however long the plan was paused, so
 * two weeks off does not leave the client two weeks behind their own schedule.
 * That is the reason `paused_on` exists at all: without it, resume would have
 * to guess, and the calendar would silently skip the missed block.
 */
export async function setAssignmentStatusAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  if (!(await requireAdminId())) return fail("not_admin");

  const id = readId(formData, "assignmentId");
  if (!id) return fail("not_found");

  const action = formData.get("action");
  if (!isStatusAction(action)) return fail("unknown");

  const day = await today();

  try {
    if (action === "resume") {
      const result = await db.execute(sql`
        update public.client_assignments
        set status     = 'active'::public.assignment_status,
            start_date = start_date
                         + greatest(${day}::date - coalesce(paused_on, ${day}::date), 0),
            paused_on  = null
        where id = ${id}::uuid and status = 'paused'
      `);

      if (result.count === 0) return fail("not_found");
    } else {
      const next =
        action === "pause"
          ? ("paused" as const)
          : action === "complete"
            ? ("completed" as const)
            : ("cancelled" as const);

      const result = await db
        .update(clientAssignments)
        .set({
          status: next,
          pausedOn: action === "pause" ? day : null,
          endedOn: action === "pause" ? null : day,
          updatedAt: new Date(),
        })
        .where(eq(clientAssignments.id, id));

      if (result.count === 0) return fail("not_found");
    }
  } catch (error) {
    console.error("setAssignmentStatus failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

/**
 * Moves the whole plan to a different start day.
 *
 * One date, one UPDATE — the reason the schedule is derived rather than stored
 * as rows. Shifting a twelve-week plan by three days touches nothing else.
 */
export async function moveAssignmentAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  if (!(await requireAdminId())) return fail("not_admin");

  const id = readId(formData, "assignmentId");
  if (!id) return fail("not_found");

  const startDate = readDay(formData, "startDate");
  if (!startDate) return fail("invalid_date");

  try {
    const result = await db
      .update(clientAssignments)
      .set({ startDate, updatedAt: new Date() })
      .where(eq(clientAssignments.id, id));

    if (result.count === 0) return fail("not_found");
  } catch (error) {
    console.error("moveAssignment failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

/* ------------------------------------------------------------------- notes */

export async function saveNoteAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  const adminId = await requireAdminId();
  if (!adminId) return fail("not_admin");

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return fail("note_required");
  if (body.length > NOTE_MAX) return fail("note_too_long");

  const noteId = readId(formData, "noteId");

  try {
    if (noteId) {
      const result = await db
        .update(clientNotes)
        .set({ body, updatedAt: new Date() })
        .where(eq(clientNotes.id, noteId));

      if (result.count === 0) return fail("not_found");
    } else {
      const userId = readId(formData, "userId");
      if (!userId) return fail("not_found");

      await db.insert(clientNotes).values({ userId, authorId: adminId, body });
    }
  } catch (error) {
    console.error("saveNote failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

export async function toggleNotePinAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  if (!(await requireAdminId())) return fail("not_admin");

  const noteId = readId(formData, "noteId");
  if (!noteId) return fail("not_found");

  try {
    const result = await db
      .update(clientNotes)
      .set({ pinned: sql`not pinned`, updatedAt: new Date() })
      .where(eq(clientNotes.id, noteId));

    if (result.count === 0) return fail("not_found");
  } catch (error) {
    console.error("toggleNotePin failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}

/**
 * Notes are deleted for real rather than soft-deleted.
 *
 * The rest of the admin hides things instead of removing them, because a
 * deleted taxonomy entry would take the tags off finished exercises with it. A
 * note points at nothing, so there is nothing to protect — and a coach who
 * wrote something they want gone is entitled to have it gone.
 */
export async function deleteNoteAction(
  _prev: ClientState,
  formData: FormData,
): Promise<ClientState> {
  if (!(await requireAdminId())) return fail("not_admin");

  const noteId = readId(formData, "noteId");
  if (!noteId) return fail("not_found");

  try {
    const result = await db
      .delete(clientNotes)
      .where(eq(clientNotes.id, noteId));

    if (result.count === 0) return fail("not_found");
  } catch (error) {
    console.error("deleteNote failed", error);
    return fail("unknown");
  }

  refresh();
  return SAVED;
}
