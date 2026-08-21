import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";

/**
 * The seam between programs (feature 08) and workouts (feature 07).
 *
 * The two features are being built in parallel sessions, so this module cannot
 * import a Drizzle table that does not exist yet. Instead it asks the database
 * at runtime whether `public.workouts` is there and reads it through plain SQL:
 *
 *   - before 07 lands, `available` is false and the editor says so, while rest
 *     days, notes, weeks and everything else in the program still work;
 *   - the moment 07's migration runs, the picker fills itself with no code
 *     change here and no deploy in between.
 *
 * It also does not assume 07's exact column names. The title and published
 * flag are resolved from a small allowlist, so a workouts table that calls its
 * title `name` still works. This is scaffolding with an expiry date: once
 * feature 07 is merged, replace the whole file with a normal Drizzle query
 * against its table and delete the guesswork.
 */

export type WorkoutOption = {
  id: string;
  title: Translated;
  isPublished: boolean;
};

export type WorkoutSource = {
  /** False until feature 07 creates the workouts table. */
  available: boolean;
  workouts: WorkoutOption[];
};

const UNAVAILABLE: WorkoutSource = { available: false, workouts: [] };

/** Candidate column names, most likely first. */
const TITLE_COLUMNS = ["title", "name", "label"] as const;
const PUBLISHED_COLUMNS = ["is_published", "published"] as const;

type ColumnRow = { column_name: string; data_type: string };

/** Only ever fed from the allowlists above, never from user input. */
function quote(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export async function listWorkouts(): Promise<WorkoutSource> {
  let columns: ColumnRow[];

  try {
    const rows = await db.execute<ColumnRow>(sql`
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public' and table_name = 'workouts'
    `);
    columns = [...rows];
  } catch (error) {
    console.error("listWorkouts: could not inspect the workouts table", error);
    return UNAVAILABLE;
  }

  if (!columns.length) return UNAVAILABLE;

  const byName = new Map(columns.map((c) => [c.column_name, c.data_type]));
  if (!byName.has("id")) return UNAVAILABLE;

  const titleColumn = TITLE_COLUMNS.find((name) => byName.has(name));
  if (!titleColumn) return UNAVAILABLE;

  const publishedColumn = PUBLISHED_COLUMNS.find((name) => byName.has(name));
  const titleIsJson = (byName.get(titleColumn) ?? "").includes("json");

  const select = [
    `id::text as id`,
    `${quote(titleColumn)} as title`,
    publishedColumn ? `${quote(publishedColumn)} as is_published` : `true as is_published`,
  ].join(", ");

  try {
    const rows = await db.execute<{
      id: string;
      title: unknown;
      is_published: boolean;
    }>(sql.raw(`select ${select} from public.workouts`));

    return {
      available: true,
      workouts: [...rows].map((row) => ({
        id: row.id,
        title: titleIsJson
          ? ((row.title ?? {}) as Translated)
          : ({ sr: String(row.title ?? "") } as Translated),
        isPublished: Boolean(row.is_published),
      })),
    };
  } catch (error) {
    console.error("listWorkouts: reading public.workouts failed", error);
    return UNAVAILABLE;
  }
}

/** Alphabetical in the locale the admin is actually looking at. */
export function sortWorkouts(
  workouts: WorkoutOption[],
  locale: Locale,
): WorkoutOption[] {
  return [...workouts].sort((a, b) =>
    translate(a.title, locale).localeCompare(translate(b.title, locale), locale),
  );
}
