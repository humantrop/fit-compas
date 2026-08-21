import { Surface } from "@/components/ui/surface";
import type { ClientsCopy } from "@/lib/clients/copy";
import {
  formatDuration,
  formatMoment,
  formatNumber,
  formatVolume,
} from "@/lib/clients/format";
import type { ClientDetail } from "@/lib/clients/types";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * What the client actually did, read straight from the runner's log.
 *
 * No second bookkeeping: `workout_sessions` already holds the totals the runner
 * computed at finish time, which is the same source the client's own dashboard
 * counts from. Two screens reading one table cannot disagree about a number.
 */
export function ActivityList({
  totals,
  sessions,
  available,
  lang,
  copy,
  timeZone,
}: {
  totals: ClientDetail["totals"];
  sessions: ClientDetail["sessions"];
  available: boolean;
  lang: Locale;
  copy: ClientsCopy;
  timeZone: string;
}) {
  const detail = copy.detail;
  const tag = localeTags[lang];

  return (
    <Surface className="flex flex-col gap-5 p-6">
      <h2 className="text-[15px] font-semibold text-ink-100">
        {detail.activityHeading}
      </h2>

      {available ? null : (
        <p className="text-[13px] text-amber-200/80">{detail.activityUnavailable}</p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={detail.sessions} value={formatNumber(totals.sessions, tag)} />
        <Tile label={detail.sets} value={formatNumber(totals.sets, tag)} />
        <Tile label={detail.volume} value={formatVolume(totals.volume, tag)} />
        <Tile label={detail.time} value={formatDuration(totals.seconds)} />
      </dl>

      {sessions.length === 0 ? (
        <p className="text-[13px] text-ink-500">{detail.activityEmpty}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/6">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <p className="min-w-0 flex-1 truncate text-[14px] text-ink-100">
                {session.workoutTitle || session.workoutRef}
              </p>

              {session.status === "completed" ? null : (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                    session.status === "in_progress"
                      ? "border-brand-500/25 bg-brand-500/10 text-brand-200"
                      : "border-white/10 bg-white/5 text-ink-400",
                  )}
                >
                  {session.status === "in_progress"
                    ? detail.inProgress
                    : detail.abandoned}
                </span>
              )}

              <span className="text-[12px] text-ink-500">
                {formatNumber(session.completedSets, tag)}/
                {formatNumber(session.totalSets, tag)} · {formatDuration(session.elapsedSec)}
                {session.rpe ? ` · ${detail.rpe} ${formatNumber(session.rpe, tag)}` : ""}
              </span>

              <span className="text-[12px] text-ink-500">
                {formatMoment(session.startedAt, tag, timeZone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-control border border-white/6 bg-white/3 p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-bold text-ink-50">{value}</dd>
    </div>
  );
}
