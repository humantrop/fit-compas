import { CalendarRange, PauseCircle } from "lucide-react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { formatDayLong } from "@/lib/clients/format";
import { fill, plural, type PlanCopy } from "@/lib/plan/copy";
import type { PlanView } from "@/lib/plan/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * Which program, and how far into it you are.
 *
 * The progress line is computed from the same `planProgress()` the trainer's
 * screen calls, not counted off the calendar below it. A client and a coach
 * reading different week numbers off the same plan is the kind of thing that
 * gets noticed in a conversation rather than in a bug report.
 */
export function PlanHeader({
  plan,
  lang,
  localeTag,
  copy,
}: {
  plan: PlanView;
  lang: Locale;
  localeTag: string;
  copy: PlanCopy;
}) {
  if (!plan.program) return null;

  const { header } = copy;
  const paused = plan.assignmentStatus === "paused";

  // Null progress has two meanings and they are not the same sentence: the
  // plan has not started, or it has run out.
  const outside =
    plan.progress === null
      ? plan.startDate && plan.today < plan.startDate
        ? header.notStarted
        : header.finished
      : null;

  return (
    <Surface tone="strong" edge className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow>{header.eyebrow}</Eyebrow>
        <p className="text-[12px] font-medium text-ink-500">
          {plural(header.weeks, plan.program.weekCount, localeTag)}
        </p>
      </div>

      <div className="flex items-start gap-4">
        <span className="mt-0.5 text-brand-300">
          <CalendarRange className="size-6" />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            {translate(plan.program.title, lang)}
          </h2>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-400">
            {plan.startDate ? (
              <span>
                {fill(header.starts, {
                  date: formatDayLong(plan.startDate, localeTag),
                })}
              </span>
            ) : null}
            {plan.endDate ? (
              <span>
                {fill(header.ends, {
                  date: formatDayLong(plan.endDate, localeTag),
                })}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {plan.progress ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[14px] font-semibold text-ink-100">
              {fill(header.progress, {
                week: plan.progress.week,
                total: plan.progress.totalWeeks,
              })}
              <span className="ml-2 font-medium text-ink-500">
                {fill(header.dayOf, { day: plan.progress.day })}
              </span>
            </p>
            <p className="text-[12px] font-medium text-ink-500 tabular-nums">
              {fill(header.percent, { percent: plan.progress.percent })}
            </p>
          </div>

          <div
            role="progressbar"
            aria-valuenow={plan.progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 overflow-hidden rounded-full bg-white/8"
          >
            <span
              className="block h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600"
              style={{ width: `${plan.progress.percent}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-ink-400">{outside}</p>
      )}

      {paused ? (
        <p className="flex items-start gap-2.5 rounded-control border border-warn/25 bg-warn/8 p-3.5 text-[13px] leading-relaxed text-ink-200">
          <PauseCircle className="mt-0.5 size-4 shrink-0 text-warn" />
          {header.paused}
        </p>
      ) : null}
    </Surface>
  );
}
