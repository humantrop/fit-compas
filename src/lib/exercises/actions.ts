"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db/client";
import {
  exerciseActivities,
  exerciseEquipment,
  exerciseGoals,
  exerciseMuscleGroups,
  exercises,
} from "@/db/schema/exercises";
import type { Translated } from "@/db/schema/i18n";
import { videoAssets } from "@/db/schema/media";
import { getProfile } from "@/lib/auth/session";
import { getVideoAsset } from "@/lib/exercises/queries";
import {
  isDefaultMode,
  isDifficulty,
  type ExerciseErrorCode,
  type ExerciseState,
} from "@/lib/exercises/types";
import { isLocale, locales, type Locale } from "@/lib/i18n/config";
import { isValidSlug, slugify } from "@/lib/taxonomy/slug";
import { getVideoProvider } from "@/lib/video";

/**
 * Exercise CRUD.
 *
 * Same shape as the taxonomy actions: an error *code* comes back, never a
 * sentence, and the client maps it through the dictionary. The role check is
 * repeated in every function because a Server Action is reachable by a direct
 * POST and Drizzle connects as `postgres`, which bypasses RLS.
 */

function fail(code: ExerciseErrorCode): ExerciseState {
  return { status: "error", code };
}

async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

/** Postgres unique_violation — the slug is already taken. */
function isUniqueViolation(error: unknown): boolean {
  return errorCode(error) === "23505";
}

/** Postgres foreign_key_violation — a tag id that does not exist. */
function isForeignKeyViolation(error: unknown): boolean {
  return errorCode(error) === "23503";
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return;
  return (error as { code?: string }).code;
}

const uuid = z.string().uuid();
const shortText = z.string().trim().max(120);
const longText = z.string().trim().max(2000);

/**
 * Only locales actually filled in get stored; `translate()` falls back for the
 * rest. Serbian is the fallback target, so it is the one field that cannot be
 * left empty — for the title. Description and cues may be blank everywhere.
 */
function readTranslated(
  formData: FormData,
  prefix: string,
  schema: z.ZodType<string>,
): Translated | null {
  const value: Translated = {};

  for (const locale of locales) {
    const parsed = schema.safeParse(formData.get(`${prefix}_${locale}`) ?? "");
    if (!parsed.success) return null;
    if (parsed.data) value[locale] = parsed.data;
  }

  return value;
}

function readIds(formData: FormData, field: string): string[] {
  const seen = new Set<string>();
  for (const raw of formData.getAll(field)) {
    const value = String(raw);
    if (uuid.safeParse(value).success) seen.add(value);
  }
  return [...seen];
}

function readLang(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return isLocale(value) ? value : "sr";
}

type ExerciseInput = {
  title: Translated;
  description: Translated | null;
  cues: Translated | null;
  difficulty: "beginner" | "novice" | "intermediate" | "advanced" | "elite";
  defaultMode: string;
  isUnilateral: boolean;
  videoAssetId: string | null;
};

function readInput(formData: FormData): ExerciseInput | ExerciseErrorCode {
  const title = readTranslated(formData, "title", shortText);
  if (!title?.sr) return "title_required";

  const description = readTranslated(formData, "description", longText);
  const cues = readTranslated(formData, "cues", shortText);
  if (!description || !cues) return "unknown";

  const rawDifficulty = String(formData.get("difficulty") ?? "");
  if (!isDifficulty(rawDifficulty)) return "unknown";

  const rawMode = String(formData.get("default_mode") ?? "");
  if (!isDefaultMode(rawMode)) return "unknown";

  const rawVideo = String(formData.get("video_asset_id") ?? "");
  if (rawVideo && !uuid.safeParse(rawVideo).success) return "unknown";

  return {
    title,
    // An empty object would render as "the admin filled this in and left it
    // blank". Null says "not written yet", which is what the reader wants.
    description: Object.keys(description).length ? description : null,
    cues: Object.keys(cues).length ? cues : null,
    difficulty: rawDifficulty,
    defaultMode: rawMode,
    isUnilateral: formData.get("is_unilateral") === "on",
    videoAssetId: rawVideo || null,
  };
}

/**
 * Tag joins are rewritten wholesale rather than diffed. The sets are a handful
 * of rows per exercise, and "delete then insert what the form says" cannot
 * drift out of sync with the form the way a diff can.
 */
async function writeTags(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  exerciseId: string,
  formData: FormData,
): Promise<void> {
  const equipmentIds = readIds(formData, "equipment");
  const muscleIds = readIds(formData, "muscles");
  const primary = new Set(readIds(formData, "muscle_primary"));
  const goalIds = readIds(formData, "goals");
  const activityIds = readIds(formData, "activities");

  await Promise.all([
    tx.delete(exerciseEquipment).where(eq(exerciseEquipment.exerciseId, exerciseId)),
    tx
      .delete(exerciseMuscleGroups)
      .where(eq(exerciseMuscleGroups.exerciseId, exerciseId)),
    tx.delete(exerciseGoals).where(eq(exerciseGoals.exerciseId, exerciseId)),
    tx.delete(exerciseActivities).where(eq(exerciseActivities.exerciseId, exerciseId)),
  ]);

  if (equipmentIds.length) {
    await tx
      .insert(exerciseEquipment)
      .values(equipmentIds.map((id) => ({ exerciseId, equipmentId: id })));
  }
  if (muscleIds.length) {
    await tx.insert(exerciseMuscleGroups).values(
      muscleIds.map((id) => ({
        exerciseId,
        muscleGroupId: id,
        isPrimary: primary.has(id),
      })),
    );
  }
  if (goalIds.length) {
    await tx.insert(exerciseGoals).values(goalIds.map((id) => ({ exerciseId, goalId: id })));
  }
  if (activityIds.length) {
    await tx
      .insert(exerciseActivities)
      .values(activityIds.map((id) => ({ exerciseId, activityId: id })));
  }
}

/* ------------------------------------------------------------------ create */

export async function createExerciseAction(
  _prev: ExerciseState,
  formData: FormData,
): Promise<ExerciseState> {
  const profile = await getProfile();
  if (profile?.role !== "admin") return fail("not_admin");

  const input = readInput(formData);
  if (typeof input === "string") return fail(input);

  // An empty slug field means "derive one from the Serbian title".
  const typed = String(formData.get("slug") ?? "").trim();
  const slug = slugify(typed || input.title.sr || "");
  if (!isValidSlug(slug)) return fail("invalid_slug");

  const lang = readLang(formData);
  let created: string;

  try {
    created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(exercises)
        .values({ ...input, slug, createdBy: profile.id })
        .returning({ id: exercises.id });

      if (!row) throw new Error("insert returned no row");

      await writeTags(tx, row.id, formData);
      return row.id;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken");
    if (isForeignKeyViolation(error)) return fail("invalid_tag");
    console.error("createExerciseAction", error);
    return fail("unknown");
  }

  // Outside the try: redirect() works by throwing, and a catch would swallow it.
  redirect(`/${lang}/admin/exercises/${created}`);
}

/* ------------------------------------------------------------------ update */

export async function updateExerciseAction(
  _prev: ExerciseState,
  formData: FormData,
): Promise<ExerciseState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return fail("not_found");

  const input = readInput(formData);
  if (typeof input === "string") return fail(input);

  try {
    const changed = await db.transaction(async (tx) => {
      // The slug is deliberately not in the update set. It is frozen at
      // creation: workouts and saved filters point at it.
      const [row] = await tx
        .update(exercises)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(exercises.id, id))
        .returning({ id: exercises.id });

      if (!row) return false;

      await writeTags(tx, id, formData);
      return true;
    });

    if (!changed) return fail("not_found");
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail("invalid_tag");
    console.error("updateExerciseAction", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ----------------------------------------------------------------- publish */

/**
 * Publishing is a separate action, not a checkbox on the form, because it is
 * the one change with a precondition: a video that is still uploading or has
 * errored must never reach a client's workout. No video at all is allowed —
 * plenty of exercises are obvious enough to write up before filming them.
 */
export async function setExercisePublishedAction(
  _prev: ExerciseState,
  formData: FormData,
): Promise<ExerciseState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return fail("not_found");

  const publish = formData.get("published") === "true";

  try {
    const [row] = await db
      .select({ videoAssetId: exercises.videoAssetId })
      .from(exercises)
      .where(eq(exercises.id, id))
      .limit(1);

    if (!row) return fail("not_found");

    if (publish && row.videoAssetId) {
      const asset = await getVideoAsset(row.videoAssetId);
      if (!asset || asset.status !== "ready") return fail("video_not_ready");
    }

    await db
      .update(exercises)
      .set({
        isPublished: publish,
        // publishedAt records the first time it went live and is left alone
        // after that — unpublishing and republishing is not a new publication.
        publishedAt: publish ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(exercises.id, id));
  } catch (error) {
    console.error("setExercisePublishedAction", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ------------------------------------------------------------------ delete */

export async function deleteExerciseAction(
  _prev: ExerciseState,
  formData: FormData,
): Promise<ExerciseState> {
  if (!(await isAdmin())) return fail("not_admin");

  const id = String(formData.get("id") ?? "");
  if (!uuid.safeParse(id).success) return fail("not_found");

  const lang = readLang(formData);

  try {
    const [row] = await db
      .select({ videoAssetId: exercises.videoAssetId })
      .from(exercises)
      .where(eq(exercises.id, id))
      .limit(1);

    if (!row) return fail("not_found");

    // The tag joins cascade. The video does not: the FK only nulls the column,
    // which would leave an orphaned 50 MB object paying rent forever.
    if (row.videoAssetId) {
      const asset = await getVideoAsset(row.videoAssetId);
      if (asset) {
        await getVideoProvider(asset.provider).remove(asset);
        await db.delete(videoAssets).where(eq(videoAssets.id, asset.id));
      }
    }

    await db.delete(exercises).where(eq(exercises.id, id));
  } catch (error) {
    console.error("deleteExerciseAction", error);
    return fail("unknown");
  }

  redirect(`/${lang}/admin/exercises`);
}
