import "server-only";

import type { Translated } from "@/db/schema/i18n";
import { loadProgramGrid } from "@/lib/clients/queries";
import { planSlots } from "@/lib/plan/moves";
import { loadLiveAssignment, loadMoveIndex } from "@/lib/plan/queries";
import { fill, getPlanCopy } from "@/lib/plan/copy";
import { locales } from "@/lib/i18n/config";

import type { DayKey } from "./days";
import type { ScheduledDay } from "./types";

/**
 * Where "what am I supposed to train today" comes from.
 *
 * Written as a seam in feature 11, when nothing could answer the question:
 * `program_days` said what week 3 day 2 contained, but nothing said which
 * human was on week 3 day 2 today. Feature 12 assigned programs to people and
 * feature 13 built the client's calendar on top, so the seam is now filled —
 * the shape stayed and `dbScheduleSource` slotted in behind it, which is the
 * whole point of writing screens against an interface. Nothing in
 * `components/dashboard/` changed.
 *
 * The calendar is still not stored anywhere. This reads the live assignment,
 * the program grid and the client's own moves, and derives the days — the same
 * call the plan screen and the trainer's schedule strip make, so no two of the
 * three can disagree about what Tuesday holds.
 */

/**
 * `assigned` is not "the range is empty". A client with no program and a
 * client whose week happens to be blank are different sentences, and an empty
 * week strip with no explanation reads as a bug.
 */
export type ScheduleRange = {
  assigned: boolean;
  /** One entry per day in the requested range, inclusive on both ends. */
  days: ScheduledDay[];
};

export type ScheduleSource = {
  status: "ready" | "pending";
  range(userId: string, from: DayKey, to: DayKey): Promise<ScheduleRange>;
};

const EMPTY: ScheduleRange = { assigned: false, days: [] };

/**
 * "Week 3 · Day 2", in all three languages at once.
 *
 * `ScheduledDay.context` is a `Translated` because the source has no idea who
 * is reading — the dashboard picks the locale when it renders. The week's own
 * label wins when the coach gave it one: "Deload" says more than "Week 5".
 */
function contextFor(
  weekLabel: Translated | null,
  weekIndex: number,
  dayIndex: number,
): Translated {
  const context: Translated = {};

  for (const locale of locales) {
    const label = weekLabel?.[locale];
    context[locale] = label
      ? `${label} · ${fill(getPlanCopy(locale).header.dayOf, { day: dayIndex + 1 })}`
      : fill(getPlanCopy(locale).day.context, {
          week: weekIndex + 1,
          day: dayIndex + 1,
        });
  }

  return context;
}

const dbScheduleSource: ScheduleSource = {
  status: "ready",

  async range(userId, from, to) {
    try {
      const assignment = await loadLiveAssignment(userId);
      if (!assignment) return EMPTY;

      const [grid, moves] = await Promise.all([
        loadProgramGrid(assignment.programId),
        loadMoveIndex(assignment.id),
      ]);

      if (!grid) return EMPTY;

      const days = planSlots(grid, assignment.startDate, moves, from, to)
        // `before` and `after` are days outside the plan's own span. The
        // dashboard has no state for them and should say nothing rather than
        // invent one — an unassigned square is the honest rendering.
        .filter(
          (slot) =>
            slot.plan.kind === "workout" ||
            slot.plan.kind === "rest" ||
            slot.plan.kind === "open",
        )
        .map<ScheduledDay>((slot) => ({
          day: slot.day,
          kind: slot.plan.kind as ScheduledDay["kind"],
          workoutRef: slot.plan.workoutSlug,
          title: slot.plan.workoutTitle,
          summary: slot.plan.note,
          context:
            slot.plan.weekIndex !== null && slot.plan.dayIndex !== null
              ? contextFor(
                  slot.plan.weekLabel,
                  slot.plan.weekIndex,
                  slot.plan.dayIndex,
                )
              : null,
        }));

      return { assigned: true, days };
    } catch (error) {
      // The dashboard is not the screen to fail on a missing plan table. A week
      // strip with no plan on it still shows what the reader actually trained.
      console.error("[dashboard] schedule unavailable:", error);
      return EMPTY;
    }
  },
};

export function getScheduleSource(): ScheduleSource {
  return dbScheduleSource;
}
