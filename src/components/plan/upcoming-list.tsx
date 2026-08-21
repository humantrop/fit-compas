import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { formatDayNumber, formatWeekday } from "@/lib/clients/format";
import type { PlanCopy } from "@/lib/plan/copy";
import { monthOf } from "@/lib/plan/month";
import type { PlanDayView } from "@/lib/plan/types";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * What is actually coming up, under the grid.
 *
 * Workout days only. A fortnight of squares tells you the shape of the plan
 * but not what to do next, and "next" is the question this screen is opened
 * with — rest and open days are already legible in the calendar above and
 * would only pad this list out.
 */
export function UpcomingList({
  days,
  lang,
  localeTag,
  basePath,
  copy,
}: {
  days: PlanDayView[];
  lang: Locale;
  localeTag: string;
  basePath: string;
  copy: PlanCopy;
}) {
  const entries = days.filter(
    (day) => day.plan.kind === "workout" && day.plan.workoutSlug,
  );

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.upcoming.title}
      </h2>

      {entries.length === 0 ? (
        <p className="text-[13px] text-ink-500">{copy.upcoming.empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((day) => {
            const done = day.matched || day.done > 0;

            return (
              <li key={day.day}>
                <Link
                  href={`${basePath}?m=${monthOf(day.day)}&d=${day.day}`}
                  className={cn(
                    "flex items-center gap-3 rounded-control border px-3 py-2.5 transition-colors",
                    day.isToday
                      ? "border-brand-500/30 bg-brand-500/8"
                      : "border-white/6 bg-white/2 hover:border-white/14",
                  )}
                >
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] uppercase tracking-[0.1em] text-ink-500">
                      {formatWeekday(day.day, localeTag)}
                    </p>
                    <p
                      className={cn(
                        "text-[15px] font-semibold",
                        day.isToday ? "text-brand-200" : "text-ink-200",
                      )}
                    >
                      {formatDayNumber(day.day, localeTag)}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] text-ink-100">
                      {translate(day.plan.workoutTitle, lang) ||
                        copy.day.kinds.workout}
                    </p>
                    {day.movedFrom ? (
                      <p className="truncate text-[12px] text-ink-500">
                        {copy.calendar.legend.moved}
                      </p>
                    ) : null}
                  </div>

                  {done ? (
                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/12 text-emerald-200">
                      <Check className="size-4" />
                    </span>
                  ) : (
                    <ArrowUpRight className="size-4 shrink-0 text-ink-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Surface>
  );
}
