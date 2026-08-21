import { Flame } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import { fill, plural } from "@/lib/dashboard/copy";
import type { Streak } from "@/lib/dashboard/days";
import { cn } from "@/lib/utils";

/**
 * Days in a row.
 *
 * The status line is the whole point of the card. A bare number cannot say
 * whether today is already counted, and that is the one thing the reader is
 * checking for — so the streak stays lit until the day is actually over, and
 * says out loud which of the two it is. See `computeStreak`.
 */
export function StreakCard({
  streak,
  copy,
  localeTag,
}: {
  streak: Streak;
  copy: DashboardCopy["streak"];
  localeTag: string;
}) {
  const alive = streak.current > 0;

  return (
    <Surface className="flex flex-col justify-between gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink-200">{copy.title}</h2>
        <Flame
          className={cn(
            "size-5",
            alive && streak.activeToday
              ? "text-warn"
              : alive
                ? "text-warn/55"
                : "text-ink-500",
          )}
          strokeWidth={2}
        />
      </div>

      <div>
        <p
          className={cn(
            "text-4xl font-bold tracking-tight tabular-nums",
            alive ? "text-ink-50" : "text-ink-400",
          )}
        >
          {alive ? plural(copy.days, streak.current, localeTag) : "—"}
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">
          {!alive ? copy.none : streak.activeToday ? copy.kept : copy.atRisk}
        </p>
      </div>

      {streak.best > streak.current ? (
        <p className="text-[11px] font-medium text-ink-500">
          {fill(copy.best, { n: plural(copy.days, streak.best, localeTag) })}
        </p>
      ) : null}
    </Surface>
  );
}
