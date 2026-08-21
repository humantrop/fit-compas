import type {
  ExerciseStep,
  RunnerItem,
  RunnerPlan,
  RunnerStep,
  RunnerTimeline,
} from "./types";

/**
 * Flattens a plan into the ordered list of screens the runner shows.
 *
 * Rounds are expanded here rather than tracked as state during the workout.
 * A round counter means every "what comes next" question — the up-next line on
 * the rest screen, the progress bar, resuming after a reload — has to re-derive
 * the answer from three nested loops. A flat array answers all of them with an
 * index, and the index is what gets persisted.
 */

/** Seconds per rep for the time estimate. Deliberately unhurried. */
const SECONDS_PER_REP = 3.5;

/** What a set costs in time, before rest. */
export function estimateItemSec(item: RunnerItem): number {
  const base =
    item.mode === "time"
      ? (item.durationSec ?? 30)
      : (item.reps ?? 10) * SECONDS_PER_REP;

  return Math.round(item.isUnilateral ? base * 2 : base);
}

export function buildTimeline(plan: RunnerPlan): RunnerTimeline {
  const steps: RunnerStep[] = [];
  let setNumber = 0;
  let estimatedSec = 0;

  const sections = plan.sections.filter((section) => section.items.length > 0);

  sections.forEach((section, sectionIndex) => {
    const rounds = Math.max(1, section.rounds);
    const isLastSection = sectionIndex === sections.length - 1;

    for (let round = 1; round <= rounds; round += 1) {
      const isLastRound = round === rounds;

      section.items.forEach((item, itemIndex) => {
        const isLastItem = itemIndex === section.items.length - 1;
        setNumber += 1;
        estimatedSec += estimateItemSec(item);

        steps.push({
          kind: "exercise",
          key: `${section.key}:${item.key}:${round}`,
          sectionKey: section.key,
          sectionKind: section.kind,
          sectionTitle: section.title,
          round,
          totalRounds: rounds,
          item,
          setNumber,
        });

        // Rest between exercises inside a round. The last exercise of a round
        // hands over to the round rest instead, and the last exercise of the
        // last round to the section rest — otherwise the three rests stack up
        // into a two-minute wait nobody prescribed.
        if (!isLastItem && item.restSec > 0) {
          const next = section.items[itemIndex + 1];
          steps.push({
            kind: "rest",
            key: `${section.key}:${item.key}:${round}:rest`,
            scope: "set",
            durationSec: item.restSec,
            nextTitle: next.title,
          });
          estimatedSec += item.restSec;
        }
      });

      if (!isLastRound && section.restBetweenRoundsSec > 0) {
        steps.push({
          kind: "rest",
          key: `${section.key}:round:${round}:rest`,
          scope: "round",
          durationSec: section.restBetweenRoundsSec,
          nextTitle: section.items[0]?.title ?? null,
        });
        estimatedSec += section.restBetweenRoundsSec;
      }
    }

    if (!isLastSection && section.restAfterSec > 0) {
      const nextSection = sections[sectionIndex + 1];
      steps.push({
        kind: "rest",
        key: `${section.key}:section:rest`,
        scope: "section",
        durationSec: section.restAfterSec,
        nextTitle: nextSection.items[0]?.title ?? null,
      });
      estimatedSec += section.restAfterSec;
    }
  });

  return { steps, totalSets: setNumber, estimatedSec };
}

export function summarisePlan(plan: RunnerPlan) {
  const { totalSets, estimatedSec } = buildTimeline(plan);
  return { sets: totalSets, estimatedSec };
}

/** Index of the first set that has not been written down yet. */
export function resumeIndex(
  steps: RunnerStep[],
  loggedKeys: readonly string[],
): number {
  if (loggedKeys.length === 0) return 0;

  const logged = new Set(loggedKeys);
  const next = steps.findIndex(
    (step) => step.kind === "exercise" && !logged.has(step.key),
  );

  // Every set logged: the session was finished but never closed out. Land on
  // the summary rather than replaying the last set.
  return next === -1 ? steps.length : next;
}

export function isExerciseStep(step: RunnerStep): step is ExerciseStep {
  return step.kind === "exercise";
}

/** "7:30" for anything under an hour, "1:07:30" past it. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(s).padStart(2, "0")}`
    : `${mm}:${String(s).padStart(2, "0")}`;
}

/** Rounded up: a 95-second workout reading "1 min" is a lie in the wrong direction. */
export function estimateMinutes(seconds: number): number {
  return Math.max(1, Math.ceil(seconds / 60));
}
