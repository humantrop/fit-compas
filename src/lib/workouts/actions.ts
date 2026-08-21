"use server";

import { eq, inArray } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { exercises } from "@/db/schema/exercises";
import {
  workoutActivities,
  workoutGoals,
  workoutItems,
  workoutSections,
  workouts,
} from "@/db/schema/workouts";
import { getProfile } from "@/lib/auth/session";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { isValidSlug, slugify } from "@/lib/taxonomy/slug";
import { LIMITS } from "@/lib/workouts/config";
import { workoutSec, type ExerciseFacts } from "@/lib/workouts/estimate";
import { draftSchema, uuidSchema } from "@/lib/workouts/schema";
import {
  type WorkoutDraftInput,
  type WorkoutErrorCode,
  type WorkoutState,
} from "@/lib/workouts/types";

function fail(code: WorkoutErrorCode): WorkoutState {
  return { status: "error", code };
}

/**
 * Every action re-checks the role. A Server Action is an endpoint reachable by
 * a plain POST, and Drizzle connects as `postgres`, which bypasses RLS — so
 * the database will not catch a missing check here.
 */
async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

/**
 * The SQLSTATE of a failed query, dug out from under Drizzle's wrapper.
 *
 * Drizzle wraps driver errors in a `DrizzleQueryError` and hangs the real
 * `PostgresError` off `cause`, so reading `error.code` on what the catch block
 * receives finds nothing — every constraint violation would come back as
 * "unknown" and the admin would be told to try again forever.
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

/** unique_violation — the slug is already taken. */
function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23505";
}

/** foreign_key_violation — something still points at this row. */
function isForeignKeyViolation(error: unknown): boolean {
  return pgErrorCode(error) === "23503";
}

/* ----------------------------------------------------------------- create */

/**
 * Creates the shell and hands over to the builder.
 *
 * Deliberately only asks for a name: everything else about a session is
 * easier to decide with the blocks in front of you than in a dialog before
 * you have started.
 */
export async function createWorkoutAction(
  _prev: WorkoutState,
  formData: FormData,
): Promise<WorkoutState> {
  if (!(await isAdmin())) return fail("not_admin");

  // Validated, not cast: this value ends up in a redirect path, and a forged
  // "//evil.com" would make it protocol-relative and send the admin off-site.
  const raw = String(formData.get("lang") ?? "");
  const lang: Locale = isLocale(raw) ? raw : defaultLocale;
  const title = String(formData.get("title") ?? "").trim().slice(0, LIMITS.title);
  if (!title) return fail("title_required");

  const typed = String(formData.get("slug") ?? "").trim();
  const slug = slugify(typed || title);
  if (!isValidSlug(slug)) return fail("invalid_slug");

  const profile = await getProfile();

  let id: string;
  try {
    const [row] = await db
      .insert(workouts)
      .values({
        slug,
        // Serbian is the fallback every other locale resolves through, so the
        // one title we have goes there regardless of the admin's UI language.
        title: { sr: title },
        createdBy: profile?.id,
      })
      .returning({ id: workouts.id });

    if (!row) return fail("unknown");
    id = row.id;
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken");
    console.error("createWorkout failed", error);
    return fail("unknown");
  }

  // Outside the try: redirect() signals by throwing, and catching it here
  // would turn a successful create into "unknown".
  redirect(`/${lang}/admin/workouts/${id}`);
}

/* ------------------------------------------------------------------- save */

/**
 * Replaces the whole block structure in one transaction.
 *
 * Diffing sections and items against what is stored would buy nothing: a
 * workout is a few dozen rows, it is edited by one person at a time, and the
 * builder holds the authoritative version in memory. Delete-and-reinsert also
 * makes reordering free — position is just the array index.
 *
 * The row ids are not stable across a save. Nothing references a section or an
 * item by id today; when the runner (feature 10) starts logging sets it will
 * reference the exercise and the workout, not these rows.
 */
export async function saveWorkoutAction(
  input: WorkoutDraftInput,
): Promise<WorkoutState> {
  if (!(await isAdmin())) return fail("not_admin");

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_shape");

  const draft = parsed.data as unknown as WorkoutDraftInput;

  if (draft.sections.length > LIMITS.sections) return fail("too_many_sections");
  if (draft.sections.some((section) => section.items.length > LIMITS.itemsPerSection)) {
    return fail("too_many_items");
  }
  if (!draft.title.sr) return fail("title_required");

  const exerciseIds = [
    ...new Set(draft.sections.flatMap((s) => s.items.map((item) => item.exerciseId))),
  ];

  // Also the guard against a forged POST naming an id that is not an exercise.
  const facts = await loadExerciseFacts(exerciseIds);
  if (facts.size !== exerciseIds.length) return fail("unknown_exercise");

  const estimatedDurationSec = Math.round(
    workoutSec(draft.sections, (id) => facts.get(id)),
  );

  try {
    await db.transaction(async (tx) => {
      const changed = await tx
        .update(workouts)
        .set({
          title: draft.title,
          description: draft.description,
          difficulty: draft.difficulty,
          estimatedDurationSec,
          updatedAt: new Date(),
        })
        .where(eq(workouts.id, draft.id))
        .returning({ id: workouts.id });

      if (!changed.length) throw new NotFound();

      // Sections cascade to items, so one delete clears both levels.
      await tx.delete(workoutSections).where(eq(workoutSections.workoutId, draft.id));

      for (const [position, section] of draft.sections.entries()) {
        const [row] = await tx
          .insert(workoutSections)
          .values({
            workoutId: draft.id,
            kind: section.kind,
            title: section.title,
            position,
            rounds: section.rounds,
            restBetweenRoundsSec: section.restBetweenRoundsSec,
            restAfterSec: section.restAfterSec,
          })
          .returning({ id: workoutSections.id });

        if (!row || !section.items.length) continue;

        await tx.insert(workoutItems).values(
          section.items.map((item, index) => ({
            sectionId: row.id,
            exerciseId: item.exerciseId,
            position: index,
            mode: item.mode,
            sets: item.sets,
            reps: item.mode === "reps" ? item.reps : null,
            durationSec: item.mode === "time" ? item.durationSec : null,
            restSec: item.restSec,
            rpe: item.rpe,
            tempo: item.tempo,
            metrics: item.metrics,
            note: item.note,
          })),
        );
      }

      await writeTags(tx, draft);
    });
  } catch (error) {
    if (error instanceof NotFound) return fail("not_found");
    console.error("saveWorkout failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved", estimatedDurationSec };
}

/* ---------------------------------------------------------------- publish */

export async function setWorkoutPublishedAction(
  id: string,
  isPublished: boolean,
): Promise<WorkoutState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(id).success) return fail("not_found");

  try {
    if (isPublished) {
      // An empty session on somebody's Tuesday is worse than a missing one.
      const [row] = await db
        .select({ id: workoutItems.id })
        .from(workoutItems)
        .innerJoin(workoutSections, eq(workoutSections.id, workoutItems.sectionId))
        .where(eq(workoutSections.workoutId, id))
        .limit(1);

      if (!row) return fail("empty_workout");
    }

    const changed = await db
      .update(workouts)
      .set({
        isPublished,
        publishedAt: isPublished ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(workouts.id, id))
      .returning({ id: workouts.id });

    if (!changed.length) return fail("not_found");
  } catch (error) {
    console.error("setWorkoutPublished failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ----------------------------------------------------------------- delete */

/**
 * A real delete, not a retire — unlike the vocabularies, nothing points at a
 * workout yet.
 *
 * That changes with programs (feature 08), which will reference workouts with
 * `on delete restrict`. When it does, this function is the single place that
 * has to learn about it: the foreign key violation below already becomes
 * "in_use" rather than a crash, and turning it into a retire is a change here
 * and nowhere else.
 */
export async function deleteWorkoutAction(id: string): Promise<WorkoutState> {
  if (!(await isAdmin())) return fail("not_admin");
  if (!uuidSchema.safeParse(id).success) return fail("not_found");

  try {
    const removed = await db
      .delete(workouts)
      .where(eq(workouts.id, id))
      .returning({ id: workouts.id });

    if (!removed.length) return fail("not_found");
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail("in_use");
    console.error("deleteWorkout failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ---------------------------------------------------------------- helpers */

class NotFound extends Error {}

async function loadExerciseFacts(ids: string[]): Promise<Map<string, ExerciseFacts>> {
  if (!ids.length) return new Map();

  const rows = await db
    .select({ id: exercises.id, isUnilateral: exercises.isUnilateral })
    .from(exercises)
    .where(inArray(exercises.id, ids));

  return new Map(rows.map((row) => [row.id, { isUnilateral: row.isUnilateral }]));
}

/** Same wholesale replacement as the blocks, for the same reason. */
async function writeTags(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  draft: WorkoutDraftInput,
): Promise<void> {
  await tx.delete(workoutGoals).where(eq(workoutGoals.workoutId, draft.id));
  await tx.delete(workoutActivities).where(eq(workoutActivities.workoutId, draft.id));

  const goalIds = [...new Set(draft.goalIds)];
  const activityIds = [...new Set(draft.activityIds)];

  if (goalIds.length) {
    await tx
      .insert(workoutGoals)
      .values(goalIds.map((goalId) => ({ workoutId: draft.id, goalId })));
  }

  if (activityIds.length) {
    await tx
      .insert(workoutActivities)
      .values(activityIds.map((activityId) => ({ workoutId: draft.id, activityId })));
  }
}
