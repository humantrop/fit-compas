import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import { plural, type ProgressCopy } from "@/lib/progress/copy";
import { heatGrid } from "@/lib/progress/series";
import type { DayActivity } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

/**
 * A year of days, a square each.
 *
 * The streak card next to it says "nine days"; this says which nine, and what
 * the six weeks before them looked like. A number can only report the run that
 * is happening now — the grid is where somebody sees that they always stop in
 * the third week, which is the thing worth knowing.
 *
 * Columns are weeks with Monday at the top, so a row is "every Tuesday" and the
 * shape of a training week is readable straight down the grid. It scrolls
 * sideways under `sm` rather than shrinking: squares small enough to fit 52
 * weeks on a phone are squares nobody can tell apart.
 */

const WEEKS = 52;

const LEVELS = [
  "bg-white/5",
  "bg-brand-700/70",
  "bg-brand-500/85",
  "bg-glow/85",
] as const;

export function ActivityHeatmap({
  days,
  today,
  localeTag,
  copy,
}: {
  days: DayActivity[];
  today: string;
  localeTag: string;
  copy: ProgressCopy;
}) {
  const grid = heatGrid(days, today, WEEKS);

  return (
    <Surface className="flex flex-col gap-4 p-5 sm:p-6">
      <header>
        <h2 className="text-[13px] font-semibold text-ink-200">
          {copy.overview.heatTitle}
        </h2>
        <p className="mt-1 text-[12px] text-ink-500">{copy.overview.heatSubtitle}</p>
      </header>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex gap-[3px]">
          {grid.map((week) => (
            <div key={week[0].day} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <span
                  key={cell.day}
                  // Days that have not happened are holes, not zeros: the rest
                  // of this week is not a week somebody failed to train in.
                  title={
                    cell.future
                      ? undefined
                      : `${formatDayLong(cell.day, localeTag)} — ${plural(
                          copy.overview.sessions,
                          cell.sessions,
                          localeTag,
                        )}`
                  }
                  className={cn(
                    "size-[11px] rounded-[3px]",
                    cell.future ? "bg-transparent" : LEVELS[cell.level],
                    cell.day === today && "ring-1 ring-brand-300",
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-[11px] text-ink-500">
        <span>{copy.overview.heatLess}</span>
        {LEVELS.map((level) => (
          <span key={level} className={cn("size-[11px] rounded-[3px]", level)} />
        ))}
        <span>{copy.overview.heatMore}</span>
      </div>
    </Surface>
  );
}
