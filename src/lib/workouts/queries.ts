import "server-only";

import { asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { exerciseEquipment, exercises } from "@/db/schema/exercises";
import type { Translated } from "@/db/schema/i18n";
import { equipment, equipmentMetrics } from "@/db/schema/taxonomy";
import { activities, goals } from "@/db/schema/taxonomy";
import {
  workoutActivities,
  workoutGoals,
  workoutItems,
  workoutSections,
  workouts,
} from "@/db/schema/workouts";
import { METRIC_KINDS, type MetricKind } from "@/lib/taxonomy/config";
import type { SectionKind, SetMode } from "@/lib/workouts/config";
import type { Difficulty, WorkoutDraftInput } from "@/lib/workouts/types";

/* --------------------------------------------------------------- the list */

export type WorkoutSummary = {
  id: string;
  slug: string;
  title: Translated;
  difficulty: Difficulty;
  estimatedDurationSec: number;
  isPublished: boolean;
  sectionCount: number;
  itemCount: number;
  updatedAt: Date;
};

/**
 * One round trip for the whole admin list. The counts come from correlated
 * subqueries rather than a join with a group by — the list shows every
 * workout, including the ones with no blocks yet, and a join would drop those.
 */
export async function listWorkouts(): Promise<WorkoutSummary[]> {
  const rows = await db
    .select({
      id: workouts.id,
      slug: workouts.slug,
      title: workouts.title,
      difficulty: workouts.difficulty,
      estimatedDurationSec: workouts.estimatedDurationSec,
      isPublished: workouts.isPublished,
      updatedAt: workouts.updatedAt,
      /* Table names spelled out rather than interpolated: inside a sql``
         template Drizzle renders a column reference unqualified, so
         `${workoutSections.workoutId} = ${workouts.id}` comes out as
         `"workout_id" = "id"` and Postgres rejects it as ambiguous. */
      sectionCount: sql<number>`(
        select count(*)::int from public.workout_sections s
        where s.workout_id = workouts.id
      )`,
      itemCount: sql<number>`(
        select count(*)::int from public.workout_items i
        join public.workout_sections s on s.id = i.section_id
        where s.workout_id = workouts.id
      )`,
    })
    .from(workouts)
    .orderBy(desc(workouts.updatedAt));

  return rows;
}

/* ------------------------------------------------------------ the builder */

/** Exactly what the builder posts back, so load and save share one shape. */
export async function getWorkoutDraft(
  id: string,
): Promise<(WorkoutDraftInput & { slug: string; isPublished: boolean }) | null> {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
  if (!workout) return null;

  const sections = await db
    .select()
    .from(workoutSections)
    .where(eq(workoutSections.workoutId, id))
    .orderBy(asc(workoutSections.position), asc(workoutSections.createdAt));

  const sectionIds = sections.map((section) => section.id);

  const items = sectionIds.length
    ? await db
        .select()
        .from(workoutItems)
        .where(inArray(workoutItems.sectionId, sectionIds))
        .orderBy(asc(workoutItems.position), asc(workoutItems.createdAt))
    : [];

  const [goalRows, activityRows] = await Promise.all([
    db
      .select({ goalId: workoutGoals.goalId })
      .from(workoutGoals)
      .where(eq(workoutGoals.workoutId, id)),
    db
      .select({ activityId: workoutActivities.activityId })
      .from(workoutActivities)
      .where(eq(workoutActivities.workoutId, id)),
  ]);

  return {
    id: workout.id,
    slug: workout.slug,
    isPublished: workout.isPublished,
    title: workout.title,
    description: workout.description ?? {},
    difficulty: workout.difficulty as Difficulty,
    goalIds: goalRows.map((row) => row.goalId),
    activityIds: activityRows.map((row) => row.activityId),
    sections: sections.map((section) => ({
      kind: section.kind as SectionKind,
      title: section.title ?? {},
      rounds: section.rounds,
      restBetweenRoundsSec: section.restBetweenRoundsSec,
      restAfterSec: section.restAfterSec,
      items: items
        .filter((item) => item.sectionId === section.id)
        .map((item) => ({
          exerciseId: item.exerciseId,
          mode: item.mode as SetMode,
          sets: item.sets,
          reps: item.reps,
          durationSec: item.durationSec,
          restSec: item.restSec,
          rpe: item.rpe,
          tempo: item.tempo,
          metrics: item.metrics ?? {},
          note: item.note ?? {},
        })),
    })),
  };
}

/* ------------------------------------------------------- the picker's data */

export type ExerciseOption = {
  id: string;
  slug: string;
  title: Translated;
  /** Proposes the mode when the line is added. Free text on the exercise row. */
  defaultMode: string;
  isUnilateral: boolean;
  isPublished: boolean;
  /** Names of the equipment it uses — the picker's second line. */
  equipmentNames: Translated[];
  /** Union of the metrics that equipment asks for, in canonical order. */
  metrics: MetricKind[];
};

/**
 * Every exercise the admin can program, with the numeric fields its equipment
 * asks for already resolved.
 *
 * This is where "dynamic fields per equipment" actually comes from: a line
 * whose exercise runs on a treadmill offers incline and speed, a barbell line
 * offers weight, and neither is hardcoded anywhere — it walks
 * exercise -> equipment -> equipment_metrics, all three editable from the
 * Configuration screen.
 *
 * Drafts are included: the admin builds a session and the exercise library in
 * the same sitting, and `publishWorkoutAction` is what refuses to ship a
 * workout built on unpublished movements.
 */
export async function listExerciseOptions(): Promise<ExerciseOption[]> {
  const rows = await db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      title: exercises.title,
      defaultMode: exercises.defaultMode,
      isUnilateral: exercises.isUnilateral,
      isPublished: exercises.isPublished,
    })
    .from(exercises)
    .orderBy(asc(exercises.slug));

  if (!rows.length) return [];

  const links = await db
    .select({
      exerciseId: exerciseEquipment.exerciseId,
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      metric: equipmentMetrics.metric,
    })
    .from(exerciseEquipment)
    .innerJoin(equipment, eq(equipment.id, exerciseEquipment.equipmentId))
    .leftJoin(equipmentMetrics, eq(equipmentMetrics.equipmentId, equipment.id));

  const names = new Map<string, Map<string, Translated>>();
  const metrics = new Map<string, Set<MetricKind>>();

  for (const link of links) {
    let byEquipment = names.get(link.exerciseId);
    if (!byEquipment) names.set(link.exerciseId, (byEquipment = new Map()));
    byEquipment.set(link.equipmentId, link.equipmentName);

    if (!link.metric) continue;
    let set = metrics.get(link.exerciseId);
    if (!set) metrics.set(link.exerciseId, (set = new Set()));
    set.add(link.metric);
  }

  return rows.map((row) => {
    const picked = metrics.get(row.id);
    return {
      ...row,
      equipmentNames: [...(names.get(row.id)?.values() ?? [])],
      // Canonical order, so two lines on different machines lay their fields
      // out the same way.
      metrics: picked ? METRIC_KINDS.filter((metric) => picked.has(metric)) : [],
    };
  });
}

/* ------------------------------------------------------------------- tags */

export type TagOption = { id: string; name: Translated };

/** Active goals and activities, for the two tag pickers in the header. */
export async function listWorkoutTagOptions(): Promise<{
  goals: TagOption[];
  activities: TagOption[];
}> {
  const [goalRows, activityRows] = await Promise.all([
    db
      .select({ id: goals.id, name: goals.name })
      .from(goals)
      .where(eq(goals.isActive, true))
      .orderBy(asc(goals.position), asc(goals.slug)),
    db
      .select({ id: activities.id, name: activities.name })
      .from(activities)
      .where(eq(activities.isActive, true))
      .orderBy(asc(activities.position), asc(activities.slug)),
  ]);

  return { goals: goalRows, activities: activityRows };
}
