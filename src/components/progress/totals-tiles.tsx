import { Surface } from "@/components/ui/surface";
import {
  formatDuration,
  formatNumber,
  formatVolume,
} from "@/lib/clients/format";
import type { Totals } from "@/lib/dashboard/types";
import type { ProgressCopy } from "@/lib/progress/copy";

/**
 * Everything, ever.
 *
 * The dashboard shows the same four numbers over seven and thirty days,
 * because what it answers is "how is this week going". Here the window is the
 * whole log: this screen is the one somebody opens in month eight, and the
 * only number that belongs on it is the one that has been growing since month
 * one.
 *
 * Read out of `workout_sessions` through the dashboard's own reader, so the
 * two screens cannot report different totals — see `lib/progress/queries.ts`.
 */
export function TotalsTiles({
  totals,
  localeTag,
  copy,
}: {
  totals: Totals;
  localeTag: string;
  copy: ProgressCopy;
}) {
  const tiles = [
    { key: "workouts", value: formatNumber(totals.workouts, localeTag) },
    { key: "sets", value: formatNumber(totals.sets, localeTag) },
    { key: "volume", value: formatVolume(totals.volume, localeTag) },
    { key: "time", value: formatDuration(totals.seconds) },
  ] as const;

  return (
    <Surface className="p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.overview.totalsTitle}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.key}>
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
              {copy.overview.totals[tile.key]}
            </dt>
            <dd className="mt-1 text-2xl font-bold tracking-tight text-ink-50 tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
    </Surface>
  );
}
