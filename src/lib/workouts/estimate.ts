import type { DraftItemInput, DraftSectionInput } from "@/lib/workouts/types";

/**
 * How long the session takes, computed the same way in both places that need
 * the number: the builder's live preview and the save action that writes
 * `workouts.estimated_duration_sec`.
 *
 * Two implementations would drift, and the drift would show up as a workout
 * whose card says 42 minutes and whose builder says 38.
 *
 * It is deliberately an estimate. Setup between machines, the coach talking,
 * and a client who needs an extra breath are all unmodelled — a session runs
 * long more often than short, and a plan built on an optimistic number is
 * worse than one built on a rough one.
 */

/** A working rep, averaged over the tempos people actually use. */
export const SECONDS_PER_REP = 3;

/** Only the facts the estimate needs, so callers can pass a light row. */
export type ExerciseFacts = { isUnilateral: boolean };

export type FactsLookup = (exerciseId: string) => ExerciseFacts | undefined;

/** Total sets of one line: the block's rounds multiply the line's own sets. */
export function totalSets(item: DraftItemInput, rounds: number): number {
  return Math.max(1, rounds) * Math.max(1, item.sets);
}

/** Seconds of work in a single set, before any rest. */
export function workSec(item: DraftItemInput, facts?: ExerciseFacts): number {
  const one =
    item.mode === "time"
      ? (item.durationSec ?? 0)
      : (item.reps ?? 0) * SECONDS_PER_REP;

  // A unilateral movement is prescribed per side but performed twice.
  return facts?.isUnilateral ? one * 2 : one;
}

/** One line, for one round: its sets, each followed by its rest. */
export function itemSec(item: DraftItemInput, lookup: FactsLookup): number {
  const sets = Math.max(1, item.sets);
  return sets * (workSec(item, lookup(item.exerciseId)) + Math.max(0, item.restSec));
}

export function sectionSec(section: DraftSectionInput, lookup: FactsLookup): number {
  const rounds = Math.max(1, section.rounds);
  const round = section.items.reduce((sum, item) => sum + itemSec(item, lookup), 0);

  return (
    rounds * round +
    (rounds - 1) * Math.max(0, section.restBetweenRoundsSec) +
    Math.max(0, section.restAfterSec)
  );
}

export function workoutSec(
  sections: readonly DraftSectionInput[],
  lookup: FactsLookup,
): number {
  return sections.reduce((sum, section) => sum + sectionSec(section, lookup), 0);
}

/** Headline counts for the preview panel. */
export type WorkoutTotals = {
  durationSec: number;
  sections: number;
  items: number;
  sets: number;
};

export function workoutTotals(
  sections: readonly DraftSectionInput[],
  lookup: FactsLookup,
): WorkoutTotals {
  let items = 0;
  let sets = 0;

  for (const section of sections) {
    for (const item of section.items) {
      items += 1;
      sets += totalSets(item, section.rounds);
    }
  }

  return {
    durationSec: workoutSec(sections, lookup),
    sections: sections.length,
    items,
    sets,
  };
}
