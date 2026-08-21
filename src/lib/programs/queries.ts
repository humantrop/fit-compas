import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import { programDays, programWeeks, programs } from "@/db/schema/programs";
import type { Difficulty } from "@/lib/programs/config";

export type ProgramSummary = {
  id: string;
  slug: string;
  title: Translated;
  description: Translated | null;
  difficulty: Difficulty;
  daysPerWeek: number;
  isPublished: boolean;
  weekCount: number;
  /** Days with a workout on them — the honest "is this finished" number. */
  filledDays: number;
  restDays: number;
  createdAt: string;
};

export type ProgramDayView = {
  id: string;
  position: number;
  isRest: boolean;
  workoutId: string | null;
  note: Translated | null;
};

export type ProgramWeekView = {
  id: string;
  position: number;
  label: Translated | null;
  note: Translated | null;
  days: ProgramDayView[];
};

export type ProgramDetail = ProgramSummary & { weeks: ProgramWeekView[] };

/**
 * The list screen. One round trip: the two counts are lateral aggregates
 * rather than a second query plus a join in memory, because a program with 12
 * weeks fans out to 84 day rows and pulling them all back to count them is
 * wasteful for a screen that only shows two numbers.
 */
export async function listPrograms(): Promise<ProgramSummary[]> {
  const rows = await db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.title,
      description: programs.description,
      difficulty: programs.difficulty,
      daysPerWeek: programs.daysPerWeek,
      isPublished: programs.isPublished,
      createdAt: programs.createdAt,
      weekCount: sql<number>`(
        select count(*)::int from ${programWeeks}
        where ${programWeeks.programId} = ${programs.id}
      )`,
      filledDays: sql<number>`(
        select count(*)::int from ${programDays}
        join ${programWeeks} on ${programWeeks.id} = ${programDays.weekId}
        where ${programWeeks.programId} = ${programs.id}
          and ${programDays.workoutId} is not null
      )`,
      restDays: sql<number>`(
        select count(*)::int from ${programDays}
        join ${programWeeks} on ${programWeeks.id} = ${programDays.weekId}
        where ${programWeeks.programId} = ${programs.id}
          and ${programDays.isRest}
      )`,
    })
    .from(programs)
    // Newest first. The list has explicit draft/published filters, so ordering
    // by status as well would only make the default view harder to predict.
    .orderBy(desc(programs.createdAt));

  return rows.map((row) => ({
    ...row,
    difficulty: row.difficulty as Difficulty,
    createdAt: row.createdAt.toISOString(),
  }));
}

/**
 * The editor screen. Two queries, not one: a program joined to its days
 * repeats every program column once per day, and the whole grid is small
 * enough that stitching it in JS is cheaper than the duplication on the wire.
 */
export async function getProgram(id: string): Promise<ProgramDetail | null> {
  const [program] = await db
    .select({
      id: programs.id,
      slug: programs.slug,
      title: programs.title,
      description: programs.description,
      difficulty: programs.difficulty,
      daysPerWeek: programs.daysPerWeek,
      isPublished: programs.isPublished,
      createdAt: programs.createdAt,
    })
    .from(programs)
    .where(eq(programs.id, id));

  if (!program) return null;

  const rows = await db
    .select({
      weekId: programWeeks.id,
      weekPosition: programWeeks.position,
      weekLabel: programWeeks.label,
      weekNote: programWeeks.note,
      dayId: programDays.id,
      dayPosition: programDays.position,
      isRest: programDays.isRest,
      workoutId: programDays.workoutId,
      dayNote: programDays.note,
    })
    .from(programWeeks)
    // Left join: a week whose day slots were somehow lost still renders, as an
    // empty row the admin can see and fix, rather than vanishing from the grid.
    .leftJoin(programDays, eq(programDays.weekId, programWeeks.id))
    .where(eq(programWeeks.programId, id))
    .orderBy(asc(programWeeks.position), asc(programDays.position));

  const weeks: ProgramWeekView[] = [];
  const byId = new Map<string, ProgramWeekView>();

  for (const row of rows) {
    let week = byId.get(row.weekId);
    if (!week) {
      week = {
        id: row.weekId,
        position: row.weekPosition,
        label: row.weekLabel,
        note: row.weekNote,
        days: [],
      };
      byId.set(row.weekId, week);
      weeks.push(week);
    }

    if (row.dayId) {
      week.days.push({
        id: row.dayId,
        position: row.dayPosition ?? 0,
        isRest: row.isRest ?? false,
        workoutId: row.workoutId,
        note: row.dayNote,
      });
    }
  }

  const filledDays = weeks.reduce(
    (sum, week) => sum + week.days.filter((day) => day.workoutId).length,
    0,
  );
  const restDays = weeks.reduce(
    (sum, week) => sum + week.days.filter((day) => day.isRest).length,
    0,
  );

  return {
    ...program,
    difficulty: program.difficulty as Difficulty,
    createdAt: program.createdAt.toISOString(),
    weekCount: weeks.length,
    filledDays,
    restDays,
    weeks,
  };
}

/** Feeds the count on the admin home card. */
export async function countPrograms(): Promise<{ total: number; published: number }> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      published: sql<number>`(count(*) filter (where is_published))::int`,
    })
    .from(programs);

  return row ?? { total: 0, published: 0 };
}
