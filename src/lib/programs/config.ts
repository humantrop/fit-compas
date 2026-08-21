import type { difficulty } from "@/db/schema/enums";

/**
 * Shape and limits of a program, in a module the client bundle can import.
 *
 * Type-only import on purpose — same rule as lib/taxonomy/config.ts. A value
 * import from `@/db/schema` would drag Drizzle into the browser.
 */

export type Difficulty = (typeof difficulty)["enumValues"][number];

/** Spelled out so this file stays value-import-free; `satisfies` guards it. */
export const DIFFICULTIES = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const satisfies readonly Difficulty[];

export const PROGRAM_LIMITS = {
  /** A program with no weeks has nothing to show, so creation starts at one. */
  minWeeks: 1,
  /** A year of weeks. Past this the grid stops being something you can read. */
  maxWeeks: 52,
  minDaysPerWeek: 1,
  /** The calendar week. Longer blocks are modelled as more weeks, not wider ones. */
  maxDaysPerWeek: 7,
  titleMax: 120,
  descriptionMax: 600,
  noteMax: 240,
  labelMax: 60,
} as const;

export function clampWeeks(value: number): number {
  if (!Number.isFinite(value)) return PROGRAM_LIMITS.minWeeks;
  return Math.min(
    PROGRAM_LIMITS.maxWeeks,
    Math.max(PROGRAM_LIMITS.minWeeks, Math.trunc(value)),
  );
}

export function clampDaysPerWeek(value: number): number {
  if (!Number.isFinite(value)) return 7;
  return Math.min(
    PROGRAM_LIMITS.maxDaysPerWeek,
    Math.max(PROGRAM_LIMITS.minDaysPerWeek, Math.trunc(value)),
  );
}

export function isDifficulty(value: unknown): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(String(value));
}
