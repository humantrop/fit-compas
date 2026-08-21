import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import type { Locale } from "@/lib/i18n/config";
import type { SessionHistoryRow } from "@/lib/runner/queries";
import { formatClock } from "@/lib/runner/timeline";

/** The last few finished workouts. The full history is feature 14. */
export function RecentList({
  lang,
  sessions,
  copy,
  localeTag,
}: {
  lang: Locale;
  sessions: SessionHistoryRow[];
  copy: DashboardCopy["recent"];
  localeTag: string;
}) {
  const dateFormat = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
  });

  return (
    <Surface className="p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink-200">{copy.title}</h2>
        <Link
          href={`/${lang}/workout`}
          className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-300 hover:text-brand-200"
        >
          {copy.all}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-400">
          {copy.empty}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1.5">
          {sessions.map((session) => (
            <li
              key={session.id}
              className="flex items-center justify-between gap-3 rounded-control border border-white/6 bg-white/2 px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink-100">
                  {session.workoutTitle || session.workoutRef}
                </p>
                <p className="text-[11px] text-ink-500">
                  {dateFormat.format(new Date(session.startedAt))}
                </p>
              </div>

              <div className="shrink-0 text-right font-mono text-[12px] tabular-nums text-ink-300">
                <p>{formatClock(session.elapsedSec)}</p>
                <p className="text-[11px] text-ink-500">
                  {session.completedSets} {copy.sets}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
