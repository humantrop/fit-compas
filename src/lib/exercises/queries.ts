import "server-only";

import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db/client";
import type { videoStatus } from "@/db/schema/enums";
import {
  exerciseActivities,
  exerciseEquipment,
  exerciseGoals,
  exerciseMuscleGroups,
  exercises,
} from "@/db/schema/exercises";
import type { Translated } from "@/db/schema/i18n";
import { videoAssets, type VideoAsset } from "@/db/schema/media";
import { activities, equipment, goals, muscleGroups } from "@/db/schema/taxonomy";
import {
  EMPTY_TAGS,
  type Difficulty,
  type ExerciseFilters,
  type ExerciseTagIds,
} from "@/lib/exercises/types";
import { providerFor } from "@/lib/video";

export type VideoStatus = (typeof videoStatus)["enumValues"][number];

/** One vocabulary row, flattened for a picker. */
export type TagOption = {
  id: string;
  slug: string;
  name: Translated;
  isActive: boolean;
  /** Muscle groups only — the tree is one level deep. */
  parentId: string | null;
};

export type TagOptions = {
  equipment: TagOption[];
  muscles: TagOption[];
  goals: TagOption[];
  activities: TagOption[];
};

/**
 * Every vocabulary the exercise form and the filter bar offer.
 *
 * Retired items are included but flagged: an exercise tagged before the item
 * was switched off must still render that tag, and the picker hides inactive
 * ones unless they are already selected.
 */
export async function listTagOptions(): Promise<TagOptions> {
  const [equipmentRows, muscleRows, goalRows, activityRows] = await Promise.all([
    db.select().from(equipment).orderBy(asc(equipment.position), asc(equipment.slug)),
    db
      .select()
      .from(muscleGroups)
      .orderBy(asc(muscleGroups.position), asc(muscleGroups.slug)),
    db.select().from(goals).orderBy(asc(goals.position), asc(goals.slug)),
    db.select().from(activities).orderBy(asc(activities.position), asc(activities.slug)),
  ]);

  const flat = (row: {
    id: string;
    slug: string;
    name: Translated;
    isActive: boolean;
  }): TagOption => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    isActive: row.isActive,
    parentId: null,
  });

  return {
    equipment: equipmentRows.map(flat),
    muscles: sortMuscleTree(
      muscleRows.map((row) => ({ ...flat(row), parentId: row.parentId })),
    ),
    goals: goalRows.map(flat),
    activities: activityRows.map(flat),
  };
}

/**
 * Parents first, each followed by its own children. The picker renders one
 * flat list and indents by `parentId`, so the ordering has to carry the tree.
 */
function sortMuscleTree(rows: TagOption[]): TagOption[] {
  const children = new Map<string, TagOption[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = children.get(row.parentId);
    if (list) list.push(row);
    else children.set(row.parentId, [row]);
  }

  const parents = rows.filter((row) => !row.parentId);
  const placed = new Set(parents.map((row) => row.id));

  return [
    ...parents.flatMap((parent) => [parent, ...(children.get(parent.id) ?? [])]),
    // A child whose parent was deleted would otherwise vanish from the picker.
    ...rows.filter((row) => row.parentId && !placed.has(row.parentId)),
  ];
}

/* -------------------------------------------------------------------- list */

export type ExerciseVideoSummary = {
  id: string;
  status: VideoStatus;
  durationSec: number | null;
  thumbnailUrl: string | null;
};

export type ExerciseListItem = {
  id: string;
  slug: string;
  title: Translated;
  difficulty: Difficulty;
  defaultMode: string;
  isUnilateral: boolean;
  isPublished: boolean;
  updatedAt: Date;
  video: ExerciseVideoSummary | null;
  /** Primary movers first, then the rest. Rendered as chips on the card. */
  muscles: Translated[];
  equipment: Translated[];
};

export type ExerciseListPage = {
  items: ExerciseListItem[];
  /** Rows matching the filters, before the cap below. */
  total: number;
  limit: number;
};

/**
 * No pagination yet, a hard cap instead. One coach's library is hundreds of
 * exercises, not thousands. `total` comes back with it so the list can say
 * when it is not showing everything — a silent truncation reads as "that is
 * all there is".
 */
const LIST_LIMIT = 200;

export async function listExercises(
  filters: ExerciseFilters,
): Promise<ExerciseListPage> {
  const where = buildWhere(filters);

  const [rows, counted] = await Promise.all([
    db
      .select({ exercise: exercises, video: videoAssets })
      .from(exercises)
      .leftJoin(videoAssets, eq(videoAssets.id, exercises.videoAssetId))
      .where(where)
      .orderBy(desc(exercises.updatedAt))
      .limit(LIST_LIMIT),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(exercises)
      .leftJoin(videoAssets, eq(videoAssets.id, exercises.videoAssetId))
      .where(where),
  ]);

  const ids = rows.map((row) => row.exercise.id);
  const [muscleNames, equipmentNames] = await Promise.all([
    muscleNamesFor(ids),
    equipmentNamesFor(ids),
  ]);

  return {
    items: rows.map(({ exercise, video }) => ({
      id: exercise.id,
      slug: exercise.slug,
      title: exercise.title,
      difficulty: exercise.difficulty,
      defaultMode: exercise.defaultMode,
      isUnilateral: exercise.isUnilateral,
      isPublished: exercise.isPublished,
      updatedAt: exercise.updatedAt,
      video: video ? summariseVideo(video) : null,
      muscles: muscleNames.get(exercise.id) ?? [],
      equipment: equipmentNames.get(exercise.id) ?? [],
    })),
    total: counted[0]?.count ?? 0,
    limit: LIST_LIMIT,
  };
}

export function summariseVideo(asset: VideoAsset): ExerciseVideoSummary {
  return {
    id: asset.id,
    status: asset.status,
    durationSec: asset.durationSec,
    thumbnailUrl: providerFor(asset).thumbnailUrl(asset),
  };
}

function buildWhere(filters: ExerciseFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.q) {
    // The whole title object is searched as text rather than one locale: the
    // admin types "sklek" or "push up" depending on which came to mind first.
    const like = `%${filters.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const match = or(
      sql`${exercises.title}::text ilike ${like}`,
      sql`${exercises.slug} ilike ${like}`,
    );
    if (match) conditions.push(match);
  }

  if (filters.status === "published") conditions.push(eq(exercises.isPublished, true));
  if (filters.status === "draft") conditions.push(eq(exercises.isPublished, false));

  if (filters.difficulty) conditions.push(eq(exercises.difficulty, filters.difficulty));

  if (filters.video === "with") conditions.push(eq(videoAssets.status, "ready"));
  if (filters.video === "without") conditions.push(isNull(exercises.videoAssetId));
  if (filters.video === "problem") {
    // Everything the admin has to come back to: still uploading, or failed.
    conditions.push(
      sql`${videoAssets.status} in ('uploading', 'processing', 'errored')`,
    );
  }

  if (filters.equipmentId) {
    conditions.push(sql`exists (
      select 1 from ${exerciseEquipment}
      where ${exerciseEquipment.exerciseId} = ${exercises.id}
        and ${exerciseEquipment.equipmentId} = ${filters.equipmentId}
    )`);
  }

  if (filters.activityId) {
    conditions.push(sql`exists (
      select 1 from ${exerciseActivities}
      where ${exerciseActivities.exerciseId} = ${exercises.id}
        and ${exerciseActivities.activityId} = ${filters.activityId}
    )`);
  }

  if (filters.muscleGroupId) {
    // Picking a parent group matches its children too. Choosing "Back" and
    // getting nothing because everything is tagged "Lats" is not useful.
    conditions.push(sql`exists (
      select 1 from ${exerciseMuscleGroups}
      join ${muscleGroups} on ${muscleGroups.id} = ${exerciseMuscleGroups.muscleGroupId}
      where ${exerciseMuscleGroups.exerciseId} = ${exercises.id}
        and (${muscleGroups.id} = ${filters.muscleGroupId}
             or ${muscleGroups.parentId} = ${filters.muscleGroupId})
    )`);
  }

  return conditions.length ? and(...conditions) : undefined;
}

async function muscleNamesFor(ids: string[]): Promise<Map<string, Translated[]>> {
  if (!ids.length) return new Map();

  const rows = await db
    .select({
      exerciseId: exerciseMuscleGroups.exerciseId,
      name: muscleGroups.name,
    })
    .from(exerciseMuscleGroups)
    .innerJoin(muscleGroups, eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId))
    .where(inArray(exerciseMuscleGroups.exerciseId, ids))
    .orderBy(desc(exerciseMuscleGroups.isPrimary), asc(muscleGroups.position));

  return group(rows);
}

async function equipmentNamesFor(ids: string[]): Promise<Map<string, Translated[]>> {
  if (!ids.length) return new Map();

  const rows = await db
    .select({
      exerciseId: exerciseEquipment.exerciseId,
      name: equipment.name,
    })
    .from(exerciseEquipment)
    .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
    .where(inArray(exerciseEquipment.exerciseId, ids))
    .orderBy(asc(equipment.position));

  return group(rows);
}

function group(
  rows: { exerciseId: string; name: Translated }[],
): Map<string, Translated[]> {
  const byId = new Map<string, Translated[]>();
  for (const row of rows) {
    const list = byId.get(row.exerciseId);
    if (list) list.push(row.name);
    else byId.set(row.exerciseId, [row.name]);
  }
  return byId;
}

/* ------------------------------------------------------------------ detail */

export type ExerciseDetail = {
  id: string;
  slug: string;
  title: Translated;
  description: Translated | null;
  cues: Translated | null;
  difficulty: Difficulty;
  defaultMode: string;
  isUnilateral: boolean;
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  videoAsset: VideoAsset | null;
  tags: ExerciseTagIds;
};

export async function getExercise(id: string): Promise<ExerciseDetail | null> {
  const [row] = await db
    .select({ exercise: exercises, video: videoAssets })
    .from(exercises)
    .leftJoin(videoAssets, eq(videoAssets.id, exercises.videoAssetId))
    .where(eq(exercises.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.exercise.id,
    slug: row.exercise.slug,
    title: row.exercise.title,
    description: row.exercise.description,
    cues: row.exercise.cues,
    difficulty: row.exercise.difficulty,
    defaultMode: row.exercise.defaultMode,
    isUnilateral: row.exercise.isUnilateral,
    isPublished: row.exercise.isPublished,
    publishedAt: row.exercise.publishedAt,
    updatedAt: row.exercise.updatedAt,
    videoAsset: row.video,
    tags: await tagsFor(row.exercise.id),
  };
}

async function tagsFor(exerciseId: string): Promise<ExerciseTagIds> {
  const [equipmentRows, muscleRows, goalRows, activityRows] = await Promise.all([
    db
      .select({ id: exerciseEquipment.equipmentId })
      .from(exerciseEquipment)
      .where(eq(exerciseEquipment.exerciseId, exerciseId)),
    db
      .select({
        id: exerciseMuscleGroups.muscleGroupId,
        isPrimary: exerciseMuscleGroups.isPrimary,
      })
      .from(exerciseMuscleGroups)
      .where(eq(exerciseMuscleGroups.exerciseId, exerciseId)),
    db
      .select({ id: exerciseGoals.goalId })
      .from(exerciseGoals)
      .where(eq(exerciseGoals.exerciseId, exerciseId)),
    db
      .select({ id: exerciseActivities.activityId })
      .from(exerciseActivities)
      .where(eq(exerciseActivities.exerciseId, exerciseId)),
  ]);

  return {
    ...EMPTY_TAGS,
    equipment: equipmentRows.map((row) => row.id),
    muscles: muscleRows.map((row) => row.id),
    primaryMuscles: muscleRows.filter((row) => row.isPrimary).map((row) => row.id),
    goals: goalRows.map((row) => row.id),
    activities: activityRows.map((row) => row.id),
  };
}

/** Feeds the three counters above the list. */
export async function countExercises(): Promise<{
  total: number;
  published: number;
  missingVideo: number;
}> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`(count(*) filter (where ${exercises.isPublished}))::int`,
      missingVideo: sql<number>`(count(*) filter (where ${exercises.videoAssetId} is null))::int`,
    })
    .from(exercises);

  return row ?? { total: 0, published: 0, missingVideo: 0 };
}

export async function getVideoAsset(id: string): Promise<VideoAsset | null> {
  const [row] = await db
    .select()
    .from(videoAssets)
    .where(eq(videoAssets.id, id))
    .limit(1);

  return row ?? null;
}
