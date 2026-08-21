import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import type { ProgressCopy } from "@/lib/progress/copy";
import { formatDelta, formatMeasurement, type UnitSystem } from "@/lib/progress/metrics";
import type { MeasurementEntry } from "@/lib/progress/types";

import { EntryRemove } from "./entry-remove";

/**
 * Every measurement, newest first.
 *
 * The change column is against the previous entry *of the same metric*, which
 * is what the reader means by "since last time" — computed in SQL with a `lag`
 * over the full history rather than here, because the table is paged and a
 * change computed inside a page would reset at every page boundary. See
 * `lib/progress/queries.loadEntries`.
 *
 * A table rather than cards, even on a phone. Four short columns of numbers is
 * what a measurement log is, and stacking them into cards would turn twelve
 * readings into a page of scrolling.
 */
export function MeasurementHistory({
  entries,
  units,
  localeTag,
  copy,
}: {
  entries: MeasurementEntry[];
  units: UnitSystem;
  localeTag: string;
  copy: ProgressCopy;
}) {
  return (
    <Surface className="p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.measure.historyTitle}
      </h2>

      {entries.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-400">{copy.measure.historyEmpty}</p>
      ) : (
        <div className="-mx-2 mt-4 overflow-x-auto px-2">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                <th className="pb-2 pr-3 font-semibold">{copy.measure.columns.day}</th>
                <th className="pb-2 pr-3 font-semibold">
                  {copy.measure.columns.metric}
                </th>
                <th className="pb-2 pr-3 text-right font-semibold">
                  {copy.measure.columns.value}
                </th>
                <th className="pb-2 pr-3 text-right font-semibold">
                  {copy.measure.columns.change}
                </th>
                <th className="pb-2">
                  <span className="sr-only">{copy.measure.remove}</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={`${entry.metric}-${entry.day}`}
                  className="border-t border-white/6"
                >
                  <td className="py-2.5 pr-3 text-[13px] text-ink-300 whitespace-nowrap">
                    {formatDayLong(entry.day, localeTag)}
                  </td>
                  <td className="py-2.5 pr-3 text-[13px] text-ink-200">
                    {copy.metrics[entry.metric]}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[13px] font-semibold text-ink-50 tabular-nums">
                    {formatMeasurement(entry.value, entry.metric, units, localeTag)}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[13px] text-ink-400 tabular-nums">
                    {entry.previous === null
                      ? "—"
                      : formatDelta(
                          entry.value - entry.previous,
                          entry.metric,
                          units,
                          localeTag,
                        )}
                  </td>
                  <td className="py-1.5">
                    <EntryRemove
                      metric={entry.metric}
                      day={entry.day}
                      copy={copy}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Surface>
  );
}
