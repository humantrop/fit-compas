import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias, type AnyPgColumn, type PgTable } from "drizzle-orm/pg-core";

import { db } from "@/db/client";
import {
  exerciseActivities,
  exerciseEquipment,
  exerciseGoals,
  exerciseMuscleGroups,
  exercises,
} from "@/db/schema/exercises";
import { translate, type Translated } from "@/db/schema/i18n";
import { videoAssets } from "@/db/schema/media";
import { activities, equipment, goals, muscleGroups } from "@/db/schema/taxonomy";
import type { Locale } from "@/lib/i18n/config";

import { PAGE_SIZE, type LibraryQuery } from "./filters";
import type {
  Difficulty,
  Facet,
  FacetOption,
  LibraryDetail,
  LibraryResult,
  LibraryTag,
} from "./types";

/**
 * Reads for the client-facing library.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. Published rows only. A draft exercise is one with a half-uploaded video,
 *     and it must never reach a client — not through a filter, not through a
 *     guessed slug.
 *  2. Facets are AND-ed with each other and OR-ed inside themselves. Picking
 *     "dumbbell" and "kettlebell" widens the result; adding "chest" narrows it.
 *     That is what a shop filter does, and it is the only behaviour that stays
 *     usable once there are thirty pieces of equipment.
 */

const PUBLISHED = eq(exercises.isPublished, true);

/** Which tag dimensions a card and the filter panel are built from. */
type TagDimension = "equipment" | "muscles" | "goals" | "activities";

/**
 * `%` and `_` are wildcards in LIKE, so a search for "50% incline" would match
 * far more than the reader asked for.
 */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/**
 * One correlated EXISTS per facet instead of joining the tag tables.
 *
 * Joining four tag tables multiplies rows, which then has to be undone with
 * DISTINCT before the total means anything. EXISTS keeps one row per exercise
 * and lets each tag index do its own work.
 */
function tagFilter(
  join: PgTable,
  joinExerciseId: AnyPgColumn,
  joinTagId: AnyPgColumn,
  tagTable: PgTable,
  tagId: AnyPgColumn,
  tagSlug: AnyPgColumn,
  slugs: string[],
): SQL | undefined {
  if (!slugs.length) return undefined;

  return sql`exists (
    select 1 from ${join}
    inner join ${tagTable} on ${tagId} = ${joinTagId}
    where ${joinExerciseId} = ${exercises.id} and ${inArray(tagSlug, slugs)}
  )`;
}

/**
 * A muscle filter on a parent has to return its children too: picking "Back"
 * must surface an exercise tagged only "Lats", or the filter reads as broken.
 *
 * The inner vocabulary lookup is aliased to `p` and written as raw column text
 * — `muscleGroups.slug` inside this fragment already refers to the joined copy
 * in the outer EXISTS.
 */
function muscleFilter(slugs: string[]): SQL | undefined {
  if (!slugs.length) return undefined;

  const list = sql.join(
    slugs.map((slug) => sql`${slug}`),
    sql`, `,
  );

  return sql`exists (
    select 1 from ${exerciseMuscleGroups}
    inner join ${muscleGroups}
      on ${muscleGroups.id} = ${exerciseMuscleGroups.muscleGroupId}
    where ${exerciseMuscleGroups.exerciseId} = ${exercises.id}
      and (
        ${inArray(muscleGroups.slug, slugs)}
        or ${muscleGroups.parentId} in (
          select p.id from ${muscleGroups} p where p.slug in (${list})
        )
      )
  )`;
}

function buildWhere(query: LibraryQuery, locale: Locale): SQL | undefined {
  const clauses: (SQL | undefined)[] = [PUBLISHED];

  if (query.q) {
    // Search the reader's locale and Serbian. The admin authors in Serbian
    // first, so an English-speaking client would otherwise find nothing until
    // every title has been translated.
    clauses.push(
      sql`(
        coalesce(${exercises.title} ->> ${locale}, '') || ' ' ||
        coalesce(${exercises.title} ->> 'sr', '') || ' ' ||
        coalesce(${exercises.description} ->> ${locale}, '')
      ) ilike ${likePattern(query.q)}`,
    );
  }

  clauses.push(
    tagFilter(
      exerciseEquipment,
      exerciseEquipment.exerciseId,
      exerciseEquipment.equipmentId,
      equipment,
      equipment.id,
      equipment.slug,
      query.equipment,
    ),
    muscleFilter(query.muscles),
    tagFilter(
      exerciseGoals,
      exerciseGoals.exerciseId,
      exerciseGoals.goalId,
      goals,
      goals.id,
      goals.slug,
      query.goals,
    ),
    tagFilter(
      exerciseActivities,
      exerciseActivities.exerciseId,
      exerciseActivities.activityId,
      activities,
      activities.id,
      activities.slug,
      query.activities,
    ),
  );

  if (query.difficulty.length) {
    clauses.push(inArray(exercises.difficulty, query.difficulty));
  }

  return and(...clauses.filter((clause): clause is SQL => Boolean(clause)));
}

function orderFor(query: LibraryQuery, locale: Locale): SQL[] {
  switch (query.sort) {
    case "title":
      return [asc(sql`${exercises.title} ->> ${locale}`), asc(exercises.slug)];
    case "difficulty":
      // Enum comparison follows declaration order, so this is easiest first.
      return [asc(exercises.difficulty), asc(exercises.slug)];
    default:
      return [
        desc(sql`coalesce(${exercises.publishedAt}, ${exercises.createdAt})`),
        asc(exercises.slug),
      ];
  }
}

export async function searchExercises(
  query: LibraryQuery,
  locale: Locale,
): Promise<LibraryResult> {
  const offset = (query.page - 1) * PAGE_SIZE;

  // `count(*) over ()` returns the total alongside the page, so the pager costs
  // no extra round trip.
  const rows = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      title: exercises.title,
      description: exercises.description,
      difficulty: exercises.difficulty,
      defaultMode: exercises.defaultMode,
      isUnilateral: exercises.isUnilateral,
      videoAssetId: exercises.videoAssetId,
      videoStatus: videoAssets.status,
      durationSec: videoAssets.durationSec,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(exercises)
    .leftJoin(videoAssets, eq(videoAssets.id, exercises.videoAssetId))
    .where(buildWhere(query, locale))
    .orderBy(...orderFor(query, locale))
    .limit(PAGE_SIZE)
    .offset(offset);

  if (!rows.length) {
    return { items: [], total: 0, page: query.page, pageSize: PAGE_SIZE };
  }

  const ids = rows.map((row) => row.id);
  const [equipmentTags, muscleTags] = await Promise.all([
    tagsFor(ids, "equipment", locale),
    tagsFor(ids, "muscles", locale),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: translate(row.title, locale),
      summary: translate(row.description, locale),
      difficulty: row.difficulty as Difficulty,
      mode: row.defaultMode === "time" ? ("time" as const) : ("reps" as const),
      isUnilateral: row.isUnilateral,
      hasVideo: Boolean(row.videoAssetId) && row.videoStatus === "ready",
      durationSec: row.durationSec ?? null,
      equipment: equipmentTags.get(row.id) ?? [],
      muscles: muscleTags.get(row.id) ?? [],
    })),
    total: rows[0].total,
    page: query.page,
    pageSize: PAGE_SIZE,
  };
}

export async function getExerciseBySlug(
  slug: string,
  locale: Locale,
): Promise<LibraryDetail | null> {
  const [row] = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      title: exercises.title,
      description: exercises.description,
      cues: exercises.cues,
      difficulty: exercises.difficulty,
      defaultMode: exercises.defaultMode,
      isUnilateral: exercises.isUnilateral,
      videoAssetId: exercises.videoAssetId,
      videoStatus: videoAssets.status,
      durationSec: videoAssets.durationSec,
    })
    .from(exercises)
    .leftJoin(videoAssets, eq(videoAssets.id, exercises.videoAssetId))
    .where(and(eq(exercises.slug, slug), PUBLISHED))
    .limit(1);

  if (!row) return null;

  const [equipmentTags, muscleTags, goalTags, activityTags] = await Promise.all([
    tagsFor([row.id], "equipment", locale),
    tagsFor([row.id], "muscles", locale),
    tagsFor([row.id], "goals", locale),
    tagsFor([row.id], "activities", locale),
  ]);

  const description = translate(row.description, locale);

  return {
    id: row.id,
    slug: row.slug,
    title: translate(row.title, locale),
    summary: description,
    description,
    cues: translate(row.cues, locale),
    difficulty: row.difficulty as Difficulty,
    mode: row.defaultMode === "time" ? "time" : "reps",
    isUnilateral: row.isUnilateral,
    hasVideo: Boolean(row.videoAssetId) && row.videoStatus === "ready",
    durationSec: row.durationSec ?? null,
    equipment: equipmentTags.get(row.id) ?? [],
    muscles: muscleTags.get(row.id) ?? [],
    goals: goalTags.get(row.id) ?? [],
    activities: activityTags.get(row.id) ?? [],
  };
}

/* -------------------------------------------------------------------------
   Tags

   One query per dimension for a whole page of results, not one per card:
   twenty-four cards would otherwise be ninety-six round trips.
   ------------------------------------------------------------------------- */

type TagRow = { exerciseId: string; slug: string; name: Translated };

async function tagsFor(
  exerciseIds: string[],
  dimension: TagDimension,
  locale: Locale,
): Promise<Map<string, LibraryTag[]>> {
  const rows = await selectTagRows(exerciseIds, dimension);

  const byExercise = new Map<string, LibraryTag[]>();
  for (const row of rows) {
    const tag = { slug: row.slug, label: translate(row.name, locale) };
    const list = byExercise.get(row.exerciseId);
    if (list) list.push(tag);
    else byExercise.set(row.exerciseId, [tag]);
  }
  return byExercise;
}

function selectTagRows(
  exerciseIds: string[],
  dimension: TagDimension,
): Promise<TagRow[]> {
  switch (dimension) {
    case "equipment":
      return db
        .select({
          exerciseId: exerciseEquipment.exerciseId,
          slug: equipment.slug,
          name: equipment.name,
        })
        .from(exerciseEquipment)
        .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
        .where(inArray(exerciseEquipment.exerciseId, exerciseIds))
        .orderBy(asc(equipment.position), asc(equipment.slug));

    case "muscles":
      return db
        .select({
          exerciseId: exerciseMuscleGroups.exerciseId,
          slug: muscleGroups.slug,
          name: muscleGroups.name,
        })
        .from(exerciseMuscleGroups)
        .innerJoin(
          muscleGroups,
          eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId),
        )
        .where(inArray(exerciseMuscleGroups.exerciseId, exerciseIds))
        // Primary movers first — they are what a card has room to show.
        .orderBy(
          desc(exerciseMuscleGroups.isPrimary),
          asc(muscleGroups.position),
          asc(muscleGroups.slug),
        );

    case "goals":
      return db
        .select({
          exerciseId: exerciseGoals.exerciseId,
          slug: goals.slug,
          name: goals.name,
        })
        .from(exerciseGoals)
        .innerJoin(goals, eq(goals.id, exerciseGoals.goalId))
        .where(inArray(exerciseGoals.exerciseId, exerciseIds))
        .orderBy(asc(goals.position), asc(goals.slug));

    case "activities":
      return db
        .select({
          exerciseId: exerciseActivities.exerciseId,
          slug: activities.slug,
          name: activities.name,
        })
        .from(exerciseActivities)
        .innerJoin(activities, eq(activities.id, exerciseActivities.activityId))
        .where(inArray(exerciseActivities.exerciseId, exerciseIds))
        .orderBy(asc(activities.position), asc(activities.slug));
  }
}

/* -------------------------------------------------------------------------
   Facets
   ------------------------------------------------------------------------- */

/**
 * Filter options built from what is actually tagged on published exercises.
 *
 * Listing the whole vocabulary instead would put thirty pieces of equipment in
 * the panel when four of them are in use. The counts deliberately ignore the
 * currently active filters: recomputing them per selection is a much heavier
 * query and buys nothing at this catalogue size.
 */
export async function exerciseFacets(locale: Locale): Promise<Facet[]> {
  const [equipmentOptions, muscleOptions, goalOptions, activityOptions, levels] =
    await Promise.all([
      flatFacet("equipment", locale),
      muscleFacet(locale),
      flatFacet("goals", locale),
      flatFacet("activities", locale),
      difficultyFacet(),
    ]);

  return [
    { key: "equipment", options: equipmentOptions },
    { key: "muscles", options: muscleOptions },
    { key: "goals", options: goalOptions },
    { key: "activities", options: activityOptions },
    { key: "difficulty", options: levels },
  ];
}

type FacetRow = { slug: string; name: Translated; count: number };

async function flatFacet(
  dimension: "equipment" | "goals" | "activities",
  locale: Locale,
): Promise<FacetOption[]> {
  const rows = await selectFacetRows(dimension);

  return rows.map((row) => ({
    slug: row.slug,
    label: translate(row.name, locale),
    count: row.count,
    parentSlug: null,
  }));
}

function selectFacetRows(
  dimension: "equipment" | "goals" | "activities",
): Promise<FacetRow[]> {
  const total = sql<number>`count(*)`.mapWith(Number);

  switch (dimension) {
    case "equipment":
      return db
        .select({ slug: equipment.slug, name: equipment.name, count: total })
        .from(exerciseEquipment)
        .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
        .innerJoin(exercises, eq(exercises.id, exerciseEquipment.exerciseId))
        .where(and(PUBLISHED, eq(equipment.isActive, true)))
        .groupBy(equipment.slug, equipment.name, equipment.position)
        .orderBy(asc(equipment.position), asc(equipment.slug));

    case "goals":
      return db
        .select({ slug: goals.slug, name: goals.name, count: total })
        .from(exerciseGoals)
        .innerJoin(goals, eq(goals.id, exerciseGoals.goalId))
        .innerJoin(exercises, eq(exercises.id, exerciseGoals.exerciseId))
        .where(and(PUBLISHED, eq(goals.isActive, true)))
        .groupBy(goals.slug, goals.name, goals.position)
        .orderBy(asc(goals.position), asc(goals.slug));

    case "activities":
      return db
        .select({ slug: activities.slug, name: activities.name, count: total })
        .from(exerciseActivities)
        .innerJoin(activities, eq(activities.id, exerciseActivities.activityId))
        .innerJoin(exercises, eq(exercises.id, exerciseActivities.exerciseId))
        .where(and(PUBLISHED, eq(activities.isActive, true)))
        .groupBy(activities.slug, activities.name, activities.position)
        .orderBy(asc(activities.position), asc(activities.slug));
  }
}

/** Self-join so a child option can be nested under its parent in the panel. */
async function muscleFacet(locale: Locale): Promise<FacetOption[]> {
  const parent = alias(muscleGroups, "parent_muscle_group");

  const rows = await db
    .select({
      slug: muscleGroups.slug,
      name: muscleGroups.name,
      parentSlug: parent.slug,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(exerciseMuscleGroups)
    .innerJoin(
      muscleGroups,
      eq(muscleGroups.id, exerciseMuscleGroups.muscleGroupId),
    )
    .innerJoin(exercises, eq(exercises.id, exerciseMuscleGroups.exerciseId))
    .leftJoin(parent, eq(parent.id, muscleGroups.parentId))
    .where(and(PUBLISHED, eq(muscleGroups.isActive, true)))
    .groupBy(
      muscleGroups.slug,
      muscleGroups.name,
      muscleGroups.position,
      parent.slug,
    )
    .orderBy(asc(muscleGroups.position), asc(muscleGroups.slug));

  return rows.map((row) => ({
    slug: row.slug,
    label: translate(row.name, locale),
    count: row.count,
    parentSlug: row.parentSlug ?? null,
  }));
}

/**
 * Difficulty is a column, not a vocabulary, so it counts itself and carries no
 * label — the copy module names the levels.
 */
async function difficultyFacet(): Promise<FacetOption[]> {
  const rows = await db
    .select({
      level: exercises.difficulty,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(exercises)
    .where(PUBLISHED)
    .groupBy(exercises.difficulty)
    .orderBy(asc(exercises.difficulty));

  return rows.map((row) => ({
    slug: row.level,
    label: row.level,
    count: row.count,
    parentSlug: null,
  }));
}
