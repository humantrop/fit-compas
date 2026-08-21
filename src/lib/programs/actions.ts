"use server";

import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import { programDays, programWeeks, programs } from "@/db/schema/programs";
import { getProfile } from "@/lib/auth/session";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import {
  clampDaysPerWeek,
  clampWeeks,
  isDifficulty,
  PROGRAM_LIMITS,
  type Difficulty,
} from "@/lib/programs/config";
import { listWorkouts } from "@/lib/programs/workout-source";
import type { ProgramErrorCode, ProgramState } from "@/lib/programs/types";
import { isValidSlug, slugify } from "@/lib/taxonomy/slug";

function fail(code: ProgramErrorCode): ProgramState {
  return { status: "error", code };
}

/**
 * Server Actions are reachable by a direct POST, not only through our UI, so
 * the role check belongs in every one of them. Drizzle connects as `postgres`
 * and bypasses RLS — the database will not catch a missing check here.
 */
async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

const uuidSchema = z.string().uuid();

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

/**
 * Reads one translated field out of the form: `title_sr`, `title_en`, …
 *
 * Only locales that were actually filled in are stored — `translate()` falls
 * back for the rest. Returns null when Serbian is missing and `required` is
 * set, because Serbian is what every other locale falls back to.
 */
function readTranslated(
  formData: FormData,
  prefix: string,
  max: number,
  required: boolean,
): Translated | null {
  const schema = z.string().trim().max(max);
  const value: Translated = {};

  for (const locale of locales) {
    const parsed = schema.safeParse(formData.get(`${prefix}_${locale}`) ?? "");
    if (!parsed.success) return null;
    if (parsed.data) value[locale] = parsed.data;
  }

  if (required && !value.sr) return null;
  return value;
}

function readId(formData: FormData, field = "id"): string | null {
  const parsed = uuidSchema.safeParse(formData.get(field));
  return parsed.success ? parsed.data : null;
}

function readDifficulty(formData: FormData): Difficulty {
  const value = formData.get("difficulty");
  return isDifficulty(value) ? value : "intermediate";
}

function readLang(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return isLocale(value) ? value : "sr";
}

/* ------------------------------------------------------------------ create */

export async function createProgramAction(
  _prev: ProgramState,
  formData: FormData,
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");

  const title = readTranslated(formData, "title", PROGRAM_LIMITS.titleMax, true);
  if (!title) return fail("title_required");

  const typed = String(formData.get("slug") ?? "").trim();
  const slug = slugify(typed || title.sr || "");
  if (!isValidSlug(slug)) return fail("invalid_slug");

  const weeks = clampWeeks(Number(formData.get("weeks") ?? 4));
  const daysPerWeek = clampDaysPerWeek(Number(formData.get("daysPerWeek") ?? 7));
  const difficulty = readDifficulty(formData);

  const profile = await getProfile();
  let created: string;

  try {
    created = await db.transaction(async (tx) => {
      const [program] = await tx
        .insert(programs)
        .values({
          slug,
          title,
          difficulty,
          daysPerWeek,
          createdBy: profile?.id ?? null,
        })
        .returning({ id: programs.id });

      for (let position = 0; position < weeks; position += 1) {
        await insertWeek(tx, program.id, position, daysPerWeek);
      }

      return program.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken");
    console.error("createProgram failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved", id: created };
}

/* ------------------------------------------------------------------ update */

export async function updateProgramAction(
  _prev: ProgramState,
  formData: FormData,
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = readId(formData);
  if (!id) return fail("not_found");

  const title = readTranslated(formData, "title", PROGRAM_LIMITS.titleMax, true);
  if (!title) return fail("title_required");

  const description = readTranslated(
    formData,
    "description",
    PROGRAM_LIMITS.descriptionMax,
    false,
  );

  const daysPerWeek = clampDaysPerWeek(Number(formData.get("daysPerWeek") ?? 7));

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ daysPerWeek: programs.daysPerWeek })
        .from(programs)
        .where(eq(programs.id, id));

      if (!current) throw new NotFound();

      // The slug is deliberately not updatable. It is the stable handle behind
      // URLs and saved filters — a rename must not move it.
      await tx
        .update(programs)
        .set({
          title,
          description,
          difficulty: readDifficulty(formData),
          daysPerWeek,
          updatedAt: new Date(),
        })
        .where(eq(programs.id, id));

      if (daysPerWeek !== current.daysPerWeek) {
        await resizeWeeks(tx, id, current.daysPerWeek, daysPerWeek);
      }
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    console.error("updateProgram failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ----------------------------------------------------------------- publish */

/**
 * Publishing is a deliberate step, like it is for exercises: a program with
 * half its weeks empty must not appear in a client's library because someone
 * navigated away mid-edit.
 */
export async function setProgramPublishedAction(
  id: string,
  isPublished: boolean,
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(id).success) return fail("not_found");

  try {
    await db
      .update(programs)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id));
  } catch (error) {
    console.error("setProgramPublished failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ------------------------------------------------------------------ delete */

export async function deleteProgramAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;

  const id = readId(formData);
  const lang = readLang(formData);
  if (!id) return;

  try {
    // Weeks and days go with it through ON DELETE cascade.
    await db.delete(programs).where(eq(programs.id, id));
  } catch (error) {
    console.error("deleteProgram failed", error);
    return;
  }

  // Outside any try/catch on purpose: redirect() signals by throwing.
  redirect(`/${lang}/admin/programs`);
}

/* ------------------------------------------------------------------- weeks */

export async function addWeekAction(programId: string): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(programId).success) return fail("not_found");

  try {
    await db.transaction(async (tx) => {
      const [program] = await tx
        .select({ daysPerWeek: programs.daysPerWeek })
        .from(programs)
        .where(eq(programs.id, programId));

      if (!program) throw new NotFound();

      const existing = await tx
        .select({ position: programWeeks.position })
        .from(programWeeks)
        .where(eq(programWeeks.programId, programId));

      if (existing.length >= PROGRAM_LIMITS.maxWeeks) throw new WeekLimit();

      await insertWeek(tx, programId, existing.length, program.daysPerWeek);
      await touch(tx, programId);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    if (error instanceof WeekLimit) return fail("week_limit");
    console.error("addWeek failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/**
 * Copies a week — label, notes, rest days and workout assignments — and drops
 * the copy in right after the original.
 *
 * This is the single most used button in a program builder: training blocks
 * repeat with small variations, and retyping a week of assignments to change
 * one day is the kind of busywork that makes a coach give up on the tool.
 */
export async function duplicateWeekAction(weekId: string): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(weekId).success) return fail("not_found");

  try {
    await db.transaction(async (tx) => {
      const [source] = await tx
        .select()
        .from(programWeeks)
        .where(eq(programWeeks.id, weekId));

      if (!source) throw new NotFound();

      const siblings = await tx
        .select({ id: programWeeks.id, position: programWeeks.position })
        .from(programWeeks)
        .where(eq(programWeeks.programId, source.programId))
        .orderBy(asc(programWeeks.position));

      if (siblings.length >= PROGRAM_LIMITS.maxWeeks) throw new WeekLimit();

      const at = source.position + 1;

      // Open a gap. Descending order so the unique (program_id, position)
      // index never sees two rows on the same slot mid-update.
      for (const sibling of [...siblings].reverse()) {
        if (sibling.position >= at) {
          await tx
            .update(programWeeks)
            .set({ position: sibling.position + 1 })
            .where(eq(programWeeks.id, sibling.id));
        }
      }

      const [copy] = await tx
        .insert(programWeeks)
        .values({
          programId: source.programId,
          position: at,
          label: source.label,
          note: source.note,
        })
        .returning({ id: programWeeks.id });

      const days = await tx
        .select()
        .from(programDays)
        .where(eq(programDays.weekId, weekId))
        .orderBy(asc(programDays.position));

      if (days.length) {
        await tx.insert(programDays).values(
          days.map((day) => ({
            weekId: copy.id,
            position: day.position,
            isRest: day.isRest,
            workoutId: day.workoutId,
            note: day.note,
          })),
        );
      }

      await touch(tx, source.programId);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    if (error instanceof WeekLimit) return fail("week_limit");
    console.error("duplicateWeek failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

export async function deleteWeekAction(weekId: string): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(weekId).success) return fail("not_found");

  try {
    await db.transaction(async (tx) => {
      const [week] = await tx
        .select({ programId: programWeeks.programId })
        .from(programWeeks)
        .where(eq(programWeeks.id, weekId));

      if (!week) throw new NotFound();

      const siblings = await tx
        .select({ id: programWeeks.id })
        .from(programWeeks)
        .where(eq(programWeeks.programId, week.programId));

      // A program with no weeks is not a program. Delete the program instead.
      if (siblings.length <= PROGRAM_LIMITS.minWeeks) throw new LastWeek();

      await tx.delete(programWeeks).where(eq(programWeeks.id, weekId));
      await renumberWeeks(tx, week.programId);
      await touch(tx, week.programId);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    if (error instanceof LastWeek) return fail("last_week");
    console.error("deleteWeek failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/**
 * Swaps with the neighbour, then renumbers the list from zero — the same
 * approach the taxonomy editor uses. Positions stay dense, and a program is a
 * few dozen weeks at most, so rewriting all of them costs nothing.
 */
export async function moveWeekAction(
  weekId: string,
  direction: "up" | "down",
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(weekId).success) return fail("not_found");

  try {
    await db.transaction(async (tx) => {
      const [week] = await tx
        .select({ programId: programWeeks.programId })
        .from(programWeeks)
        .where(eq(programWeeks.id, weekId));

      if (!week) throw new NotFound();

      const siblings = await tx
        .select({ id: programWeeks.id })
        .from(programWeeks)
        .where(eq(programWeeks.programId, week.programId))
        .orderBy(asc(programWeeks.position));

      const index = siblings.findIndex((row) => row.id === weekId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0) throw new NotFound();
      if (target < 0 || target >= siblings.length) return;

      [siblings[index], siblings[target]] = [siblings[target], siblings[index]];

      // Park everything above the used range first: the unique index on
      // (program_id, position) would trip halfway through an in-place rewrite.
      await tx
        .update(programWeeks)
        .set({ position: sql`${programWeeks.position} + 1000` })
        .where(eq(programWeeks.programId, week.programId));

      for (const [position, row] of siblings.entries()) {
        await tx
          .update(programWeeks)
          .set({ position, updatedAt: new Date() })
          .where(eq(programWeeks.id, row.id));
      }

      await touch(tx, week.programId);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    console.error("moveWeek failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

export async function updateWeekAction(
  _prev: ProgramState,
  formData: FormData,
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = readId(formData, "weekId");
  if (!id) return fail("not_found");

  const label = readTranslated(formData, "label", PROGRAM_LIMITS.labelMax, false);
  const note = readTranslated(formData, "note", PROGRAM_LIMITS.noteMax, false);

  try {
    await db.transaction(async (tx) => {
      const changed = await tx
        .update(programWeeks)
        .set({
          label: label && Object.keys(label).length ? label : null,
          note: note && Object.keys(note).length ? note : null,
          updatedAt: new Date(),
        })
        .where(eq(programWeeks.id, id))
        .returning({ programId: programWeeks.programId });

      if (!changed.length) throw new NotFound();
      await touch(tx, changed[0].programId);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    console.error("updateWeek failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* -------------------------------------------------------------------- days */

/**
 * Sets one cell of the grid: a workout, a rest day, or empty.
 *
 * Empty and rest are different states on purpose. Empty means "not decided
 * yet" and is what the publish check would look at; rest means the coach
 * decided this day is off.
 */
export async function setDayAction(
  _prev: ProgramState,
  formData: FormData,
): Promise<ProgramState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = readId(formData, "dayId");
  if (!id) return fail("not_found");

  const mode = String(formData.get("mode") ?? "");
  const note = readTranslated(formData, "note", PROGRAM_LIMITS.noteMax, false);

  let workoutId: string | null = null;

  if (mode === "workout") {
    const parsed = uuidSchema.safeParse(formData.get("workoutId"));
    if (!parsed.success) return fail("workout_missing");

    // The workouts table belongs to feature 07 and may not exist yet, so the
    // id is checked against whatever the source can actually see rather than
    // trusted from the form.
    const source = await listWorkouts();
    if (!source.available) return fail("workout_missing");
    if (!source.workouts.some((workout) => workout.id === parsed.data)) {
      return fail("workout_missing");
    }

    workoutId = parsed.data;
  }

  try {
    const changed = await db
      .update(programDays)
      .set({
        isRest: mode === "rest",
        workoutId,
        note: note && Object.keys(note).length ? note : null,
        updatedAt: new Date(),
      })
      .where(eq(programDays.id, id))
      .returning({ weekId: programDays.weekId });

    if (!changed.length) return fail("not_found");
  } catch (error) {
    console.error("setDay failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ----------------------------------------------------------------- helpers */

/** Thrown inside a transaction so the rollback and the error code agree. */
class NotFound extends Error {}
class WeekLimit extends Error {}
class LastWeek extends Error {}

/** The transaction handle Drizzle passes to the callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertWeek(
  tx: Tx,
  programId: string,
  position: number,
  daysPerWeek: number,
): Promise<void> {
  const [week] = await tx
    .insert(programWeeks)
    .values({ programId, position })
    .returning({ id: programWeeks.id });

  await tx.insert(programDays).values(
    Array.from({ length: daysPerWeek }, (_, index) => ({
      weekId: week.id,
      position: index,
    })),
  );
}

/**
 * Widening or narrowing every week at once, after days-per-week changed.
 *
 * Narrowing drops the trailing slots, workouts included — the form warns about
 * that before it is submitted, because there is no way to keep a day that no
 * longer has a place to sit.
 */
async function resizeWeeks(
  tx: Tx,
  programId: string,
  from: number,
  to: number,
): Promise<void> {
  const weeks = await tx
    .select({ id: programWeeks.id })
    .from(programWeeks)
    .where(eq(programWeeks.programId, programId));

  if (!weeks.length) return;
  const ids = weeks.map((week) => week.id);

  if (to < from) {
    await tx
      .delete(programDays)
      .where(and(inArray(programDays.weekId, ids), gte(programDays.position, to)));
    return;
  }

  await tx.insert(programDays).values(
    ids.flatMap((weekId) =>
      Array.from({ length: to - from }, (_, index) => ({
        weekId,
        position: from + index,
      })),
    ),
  );
}

async function renumberWeeks(tx: Tx, programId: string): Promise<void> {
  const weeks = await tx
    .select({ id: programWeeks.id })
    .from(programWeeks)
    .where(eq(programWeeks.programId, programId))
    .orderBy(asc(programWeeks.position));

  await tx
    .update(programWeeks)
    .set({ position: sql`${programWeeks.position} + 1000` })
    .where(eq(programWeeks.programId, programId));

  for (const [position, week] of weeks.entries()) {
    await tx
      .update(programWeeks)
      .set({ position })
      .where(eq(programWeeks.id, week.id));
  }
}

/** Keeps `updated_at` honest when only a child row changed. */
async function touch(tx: Tx, programId: string): Promise<void> {
  await tx
    .update(programs)
    .set({ updatedAt: new Date() })
    .where(eq(programs.id, programId));
}
