import "server-only";

import { DEMO_PLANS } from "./demo-plans";
import { summarisePlan } from "./timeline";
import type { RunnerPlan, RunnerPlanSummary } from "./types";

/**
 * Where a runnable workout comes from.
 *
 * The runner ships before the workout builder (roadmap 10 before 07, because
 * they are being built in parallel), so it cannot query a `workouts` table
 * that does not exist yet. Rather than stub the runner, the dependency is
 * inverted: the runner is written against `RunnerPlan`, and this interface is
 * the single place that decides where one comes from.
 *
 * This is the same shape as `VideoProvider` and `getAccess()` — a seam put in
 * before the thing behind it exists, so the thing behind it is one new file
 * and one changed line rather than a refactor of everything that consumes it.
 *
 * **Feature 07 checklist.** Add `dbRunnerSource` below — reading `workouts`,
 * its sections and items, joining `exercises` for title/cues/video and
 * `equipment_metrics` for the logger fields — and return it from
 * `getRunnerSource()`. Nothing in `components/runner/` or the pages changes.
 */
export interface RunnerSource {
  listPlans(): Promise<RunnerPlanSummary[]>;
  getPlan(slug: string): Promise<RunnerPlan | null>;
}

const demoRunnerSource: RunnerSource = {
  async listPlans() {
    return DEMO_PLANS.map((plan) => {
      const { sets, estimatedSec } = summarisePlan(plan);
      return {
        slug: plan.slug,
        title: plan.title,
        summary: plan.summary,
        difficulty: plan.difficulty,
        sets,
        estimatedSec,
      };
    });
  },

  async getPlan(slug) {
    return DEMO_PLANS.find((plan) => plan.slug === slug) ?? null;
  },
};

export function getRunnerSource(): RunnerSource {
  return demoRunnerSource;
}

/**
 * True while the plans are the built-in demo ones. The UI says so out loud —
 * a client seeing three fake workouts with no explanation is worse than a
 * client seeing three fake workouts labelled as such.
 */
export function isDemoSource(): boolean {
  return getRunnerSource() === demoRunnerSource;
}
