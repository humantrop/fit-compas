import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import { fill, type ProgressCopy } from "@/lib/progress/copy";
import {
  METRICS,
  formatDelta,
  formatMeasurement,
  toDisplay,
  unitSymbol,
  type UnitSystem,
} from "@/lib/progress/metrics";
import {
  areaPath,
  linePath,
  niceScale,
  plot,
  tickY,
  type Box,
} from "@/lib/progress/series";
import type { MetricSeries } from "@/lib/progress/types";

/**
 * One metric over time.
 *
 * Server-rendered SVG. There is nothing interactive about a line — no zoom, no
 * hover readout — so there is nothing here that needs to reach the browser, and
 * the chart arrives already drawn instead of after a hydration.
 *
 * **The conversion happens before the scale, not after.** Values are stored in
 * kilograms and centimetres; a reader on imperial units sees pounds and inches.
 * Scaling the canonical numbers and converting the axis labels afterwards would
 * produce an axis marked 176.4, 187.4, 198.4 — the tick spacing would be round
 * in a unit nobody is looking at. So the points are converted first and
 * `niceScale` picks round numbers in the unit on the screen.
 */

const BOX: Box = {
  width: 640,
  height: 220,
  padTop: 16,
  padRight: 16,
  padBottom: 28,
  // Room for a four-character axis label at the size it is drawn.
  padLeft: 46,
};

/** Above this many points the dots merge into the line and only add noise. */
const DOT_LIMIT = 40;

export function MetricChart({
  series,
  units,
  localeTag,
  copy,
}: {
  series: MetricSeries;
  units: UnitSystem;
  localeTag: string;
  copy: ProgressCopy;
}) {
  const def = METRICS[series.metric];
  const symbol = unitSymbol(def.quantity, units);

  const points = series.points.map((point) => ({
    day: point.day,
    value: toDisplay(point.value, def.quantity, units),
  }));

  const scale = niceScale(points.map((point) => point.value));
  const plotted = plot(points, scale, BOX);

  const first = series.first;
  const latest = series.latest;

  const numbers = new Intl.NumberFormat(localeTag, { maximumFractionDigits: 1 });

  return (
    <Surface tone="strong" edge className="flex flex-col gap-5 p-5 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink-200">
            {copy.metrics[series.metric]}
            <span className="ml-1.5 font-normal text-ink-500">{symbol}</span>
          </h2>
          <p className="mt-1 text-3xl font-bold tracking-tight text-ink-50 tabular-nums">
            {latest
              ? formatMeasurement(latest.value, series.metric, units, localeTag)
              : "—"}
          </p>
          {latest ? (
            <p className="mt-1 text-[12px] text-ink-500">
              {fill(copy.overview.measuredOn, {
                date: formatDayLong(latest.day, localeTag),
              })}
            </p>
          ) : null}
        </div>

        {/* Signed, never coloured. See `formatDelta` — the app does not know
            which direction counts as progress for the person reading it. */}
        {series.change !== null && first ? (
          <div className="text-right">
            <p className="text-[15px] font-semibold text-ink-100 tabular-nums">
              {series.change === 0
                ? copy.overview.noChange
                : formatDelta(series.change, series.metric, units, localeTag)}
            </p>
            <p className="text-[12px] text-ink-500">
              {fill(copy.overview.since, {
                date: formatDayLong(first.day, localeTag),
              })}
            </p>
          </div>
        ) : null}
      </header>

      {plotted.length === 0 ? (
        <p className="py-6 text-[13px] text-ink-400">{copy.chart.empty}</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${BOX.width} ${BOX.height}`}
            className="h-auto w-full overflow-visible"
            role="img"
            aria-label={`${copy.metrics[series.metric]} — ${
              latest
                ? formatMeasurement(latest.value, series.metric, units, localeTag)
                : ""
            }`}
          >
            <defs>
              <linearGradient id="metric-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(46 107 255)" stopOpacity="0.32" />
                <stop offset="100%" stopColor="rgb(46 107 255)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {scale.ticks.map((tick) => {
              const y = tickY(tick, scale, BOX);
              return (
                <g key={tick}>
                  <line
                    x1={BOX.padLeft}
                    x2={BOX.width - BOX.padRight}
                    y1={y}
                    y2={y}
                    stroke="rgb(255 255 255 / 0.07)"
                    strokeWidth="1"
                  />
                  <text
                    x={BOX.padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-ink-500 text-[11px]"
                  >
                    {numbers.format(tick)}
                  </text>
                </g>
              );
            })}

            {plotted.length > 1 ? (
              <path d={areaPath(plotted, BOX)} fill="url(#metric-fill)" />
            ) : null}

            <path
              d={linePath(plotted)}
              fill="none"
              stroke="rgb(123 165 255)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {plotted.length <= DOT_LIMIT
              ? plotted.map((point, index) => (
                  <circle
                    key={point.day}
                    cx={point.x}
                    cy={point.y}
                    r={index === plotted.length - 1 ? 5 : 3}
                    fill="rgb(6 10 19)"
                    stroke="rgb(123 165 255)"
                    strokeWidth="2"
                  />
                ))
              : null}

            {/* The two dates the line runs between. Everything in the middle is
                readable from the shape; labelling it would be a second axis. */}
            <text
              x={BOX.padLeft}
              y={BOX.height - 8}
              className="fill-ink-500 text-[11px]"
            >
              {formatDayLong(plotted[0].day, localeTag)}
            </text>
            {plotted.length > 1 ? (
              <text
                x={BOX.width - BOX.padRight}
                y={BOX.height - 8}
                textAnchor="end"
                className="fill-ink-500 text-[11px]"
              >
                {formatDayLong(plotted[plotted.length - 1].day, localeTag)}
              </text>
            ) : null}
          </svg>

          {plotted.length === 1 ? (
            <p className="text-[12px] text-ink-500">{copy.chart.onePoint}</p>
          ) : null}

        </>
      )}
    </Surface>
  );
}
