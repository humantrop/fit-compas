import { ChevronRight, Clock, Layers } from "lucide-react";
import Link from "next/link";

import { translate } from "@/db/schema/i18n";
import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import type { Locale } from "@/lib/i18n/config";
import { estimateMinutes } from "@/lib/runner/timeline";
import type { RunnerPlanSummary } from "@/lib/runner/types";

/**
 * Something to train when nothing is assigned.
 *
 * Reads through the runner's own source rather than a second query, so
 * whatever feature 07 puts behind that seam shows up here the same day it
 * shows up on /workout — including the "these are demo plans" warning, which
 * has to travel with them or this screen starts quietly lying.
 */
export function SuggestionList({
  lang,
  plans,
  copy,
  demo,
}: {
  lang: Locale;
  plans: RunnerPlanSummary[];
  copy: DashboardCopy["suggestions"];
  demo: boolean;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink-200">{copy.title}</h2>
      </div>
      <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-ink-400">
        {copy.body}
      </p>

      {demo ? (
        <p className="mt-3 rounded-control border border-warn/25 bg-warn/8 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-200">
          {copy.demoNotice}
        </p>
      ) : null}

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {plans.length === 0 ? (
          <Surface className="p-5 text-[13px] text-ink-400">{copy.empty}</Surface>
        ) : null}

        {plans.map((plan) => (
          <Surface
            key={plan.slug}
            as={Link}
            href={`/${lang}/workout/${plan.slug}`}
            className="group flex items-center gap-3 p-4 transition-colors hover:border-white/16 hover:bg-white/8"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[14px] font-semibold text-ink-50">
                {translate(plan.title, lang)}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-medium text-ink-500">
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  {plan.sets} {copy.sets}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {estimateMinutes(plan.estimatedSec)} {copy.minutes}
                </span>
              </div>
            </div>

            <ChevronRight className="size-4.5 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-200" />
          </Surface>
        ))}
      </div>
    </section>
  );
}
