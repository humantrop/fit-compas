import { Check, Minus } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import { plural } from "@/lib/dashboard/copy";
import { toDate } from "@/lib/dashboard/days";
import type { WeekDay } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

/**
 * Monday to Sunday, with what actually happened on each day.
 *
 * Four states, and they are deliberately not three: done, today, rest, and
 * nothing. A rest day comes from the plan and an empty day is the absence of
 * one — the same distinction the program editor makes in feature 08 — so they
 * cannot share a square. Until feature 13 assigns plans, every square is
 * either done or nothing, and the legend only lists the states in play.
 */
export function WeekStrip({
  days,
  copy,
  localeTag,
}: {
  days: WeekDay[];
  copy: DashboardCopy["week"];
  localeTag: string;
}) {
  const doneCount = days.filter((day) => day.done).length;
  const hasRest = days.some((day) => day.scheduled?.kind === "rest");
  const hasPlanned = days.some(
    (day) => day.scheduled?.kind === "workout" && !day.done,
  );

  return (
    <Surface className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink-200">{copy.title}</h2>
        <p className="text-[12px] font-medium text-ink-500">
          {plural(copy.done, doneCount, localeTag)}
        </p>
      </div>

      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const rest = day.scheduled?.kind === "rest";
          const planned = day.scheduled?.kind === "workout" && !day.done;

          return (
            <li key={day.day} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.08em]",
                  day.isToday ? "text-brand-200" : "text-ink-500",
                )}
              >
                {copy.weekdays[day.index]}
              </span>

              <span
                className={cn(
                  "flex aspect-square w-full max-w-11 items-center justify-center rounded-control border text-[13px] font-semibold tabular-nums transition-colors",
                  day.done &&
                    "border-transparent bg-linear-to-b from-brand-400 to-brand-600 text-white glow-brand",
                  !day.done &&
                    day.isToday &&
                    "border-brand-400/60 bg-brand-500/10 text-brand-100",
                  !day.done && !day.isToday && rest && "border-white/8 bg-white/2 text-ink-500",
                  !day.done &&
                    !day.isToday &&
                    planned &&
                    "border-brand-500/30 bg-brand-500/6 text-ink-200",
                  !day.done &&
                    !day.isToday &&
                    !rest &&
                    !planned &&
                    "border-white/6 bg-white/2 text-ink-500",
                  day.isFuture && !planned && !rest && "opacity-55",
                )}
              >
                {day.done ? (
                  <Check className="size-4.5" strokeWidth={2.8} />
                ) : rest ? (
                  <Minus className="size-4 text-ink-500" />
                ) : (
                  toDate(day.day).getUTCDate()
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-500">
        <Legend className="bg-brand-500" label={copy.legend.done} />
        <Legend className="bg-brand-500/25 ring-1 ring-brand-400/60" label={copy.legend.today} />
        {hasPlanned ? (
          <Legend className="bg-brand-500/20" label={copy.legend.planned} />
        ) : null}
        {hasRest ? <Legend className="bg-white/12" label={copy.legend.rest} /> : null}
      </ul>
    </Surface>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[4px]", className)} />
      {label}
    </li>
  );
}
