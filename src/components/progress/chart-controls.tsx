import Link from "next/link";

import type { BodyMetric } from "@/db/schema/progress";
import type { ProgressCopy } from "@/lib/progress/copy";
import type { RangeKey } from "@/lib/progress/range";
import { RANGE_KEYS } from "@/lib/progress/range";
import { cn } from "@/lib/utils";

/**
 * Which metric the chart is showing, and how far back it goes.
 *
 * Both live in the query string rather than in component state, the same rule
 * the library filters and the plan's month follow: a chart someone is looking
 * at is a link they can send, Back means something, and the controls stay
 * server-rendered links instead of a client component that re-fetches.
 *
 * Only metrics that have been measured are offered. A picker listing all
 * eleven, nine of which draw an empty box, is a list of things the reader has
 * not done — the place to start measuring a new one is the form on the
 * measurements screen.
 */
export function ChartControls({
  basePath,
  metrics,
  metric,
  range,
  copy,
}: {
  basePath: string;
  metrics: BodyMetric[];
  metric: BodyMetric;
  range: RangeKey;
  copy: ProgressCopy;
}) {
  function href(next: { m?: BodyMetric; r?: RangeKey }): string {
    const params = new URLSearchParams({
      m: next.m ?? metric,
      r: next.r ?? range,
    });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <Group label={copy.chart.metricLabel}>
        {metrics.map((key) => (
          <Pill
            key={key}
            href={href({ m: key })}
            active={key === metric}
            label={copy.metrics[key]}
          />
        ))}
      </Group>

      <Group label={copy.chart.rangeLabel}>
        {RANGE_KEYS.map((key) => (
          <Pill
            key={key}
            href={href({ r: key })}
            active={key === range}
            label={copy.chart.ranges[key]}
          />
        ))}
      </Group>
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      // `scroll={false}`: the controls sit under the chart they change, and
      // jumping to the top of the page after every tap loses the reader's place.
      scroll={false}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
        active
          ? "border-brand-500/40 bg-brand-500/15 text-brand-100"
          : "border-white/10 bg-white/4 text-ink-300 hover:border-white/16 hover:text-ink-100",
      )}
    >
      {label}
    </Link>
  );
}
