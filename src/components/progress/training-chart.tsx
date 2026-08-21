import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import { toDate } from "@/lib/clients/schedule";
import { fill, plural, type ProgressCopy } from "@/lib/progress/copy";
import { bucketWeeks } from "@/lib/progress/series";
import type { DayActivity } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils";

/**
 * Workouts per week.
 *
 * Columns of plain elements rather than an SVG: a bar chart is a row of
 * rectangles with a height each, and CSS already does rectangles with a height
 * each — responsively, which is the part an SVG with a fixed `viewBox` makes
 * awkward at phone width.
 *
 * Weeks with nothing in them are drawn as an empty track rather than skipped.
 * The gap is the information: a chart that closes over its quiet weeks shows
 * an unbroken run of training that did not happen.
 */

const WEEKS = 16;

/** Every fourth column gets a date under it — more turns into a smear. */
const LABEL_EVERY = 4;

/** "21.8." — the column labels have a sixteenth of the width to fit in. */
function shortDay(day: string, localeTag: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(toDate(day));
}

export function TrainingChart({
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
  const weeks = bucketWeeks(days, today, WEEKS);
  const peak = Math.max(...weeks.map((week) => week.sessions), 1);
  const total = weeks.reduce((sum, week) => sum + week.sessions, 0);

  return (
    <Surface className="flex flex-col gap-5 p-5 sm:p-6">
      <header>
        <h2 className="text-[13px] font-semibold text-ink-200">
          {copy.overview.trainingTitle}
        </h2>
        <p className="mt-1 text-[12px] text-ink-500">
          {fill(copy.overview.trainingSubtitle, { n: WEEKS })}
        </p>
      </header>

      {total === 0 ? (
        <p className="py-4 text-[13px] text-ink-400">
          {copy.overview.trainingEmpty}
        </p>
      ) : (
        <div className="flex items-end gap-1.5 sm:gap-2">
          {weeks.map((week, index) => {
            const label = plural(copy.overview.sessions, week.sessions, localeTag);
            const height = (week.sessions / peak) * 100;
            const last = index === weeks.length - 1;

            return (
              <div key={week.start} className="flex min-w-0 flex-1 flex-col gap-2">
                <div
                  className="flex h-28 items-end rounded-t-sm bg-white/3"
                  title={`${fill(copy.overview.weekOf, {
                    date: formatDayLong(week.start, localeTag),
                  })} — ${label}`}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm",
                      last
                        ? "bg-linear-to-t from-brand-600 to-glow"
                        : "bg-linear-to-t from-brand-700 to-brand-400",
                      // A zero week still shows a hairline, so the column reads
                      // as an empty week rather than as a missing one.
                      week.sessions === 0 && "bg-none bg-white/8",
                    )}
                    style={{ height: `${Math.max(height, week.sessions === 0 ? 2 : 8)}%` }}
                  />
                </div>

                <span className="truncate text-center text-[10px] text-ink-500">
                  {(weeks.length - 1 - index) % LABEL_EVERY === 0
                    ? shortDay(week.start, localeTag)
                    : " "}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Surface>
  );
}
