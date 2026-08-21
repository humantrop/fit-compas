import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import { formatCount, formatDuration, formatVolume } from "@/lib/dashboard/format";
import type { Totals } from "@/lib/dashboard/types";

/**
 * The four numbers, over two windows.
 *
 * Recent and all-time next to each other rather than behind a range switcher:
 * the comparison is the information. A single figure of 62 sets means nothing
 * on its own, and a control to reveal the other one is a click asking a
 * question the reader already had.
 *
 * All four are read straight off `workout_sessions`, which the runner totals
 * at finish time by recomputing from the set rows — so a set submitted twice
 * does not show up here twice.
 */
export function StatTiles({
  rows,
  copy,
  localeTag,
  unavailable,
}: {
  rows: { label: string; totals: Totals }[];
  copy: DashboardCopy["stats"];
  localeTag: string;
  unavailable: boolean;
}) {
  return (
    <Surface className="p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">{copy.title}</h2>

      {unavailable ? (
        <p className="mt-3 rounded-control border border-warn/25 bg-warn/8 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-200">
          {copy.unavailable}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-5">
        {rows.map((row) => (
          <section key={row.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {row.label}
            </p>

            <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Tile
                label={copy.workouts}
                value={formatCount(row.totals.workouts, localeTag)}
              />
              <Tile
                label={copy.sets}
                value={formatCount(row.totals.sets, localeTag)}
              />
              <Tile
                label={copy.volume}
                value={formatVolume(row.totals.volume, localeTag, copy)}
              />
              <Tile
                label={copy.time}
                value={formatDuration(row.totals.seconds, copy)}
              />
            </dl>
          </section>
        ))}
      </div>
    </Surface>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular-nums text-ink-50">
        {value}
      </dd>
    </div>
  );
}
