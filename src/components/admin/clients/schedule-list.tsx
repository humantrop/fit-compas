import { Check, Circle, Dot, Moon } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { ClientsCopy } from "@/lib/clients/copy";
import { fill } from "@/lib/clients/copy";
import { formatDay, formatDayNumber, formatWeekday } from "@/lib/clients/format";
import type { ScheduleEntry } from "@/lib/clients/types";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The plan laid out on real dates, with what actually happened beside it.
 *
 * A list rather than a month grid: the useful question on this screen is "is
 * this person keeping up", and that reads down a column of consecutive days —
 * a month view spends most of its space on cells nobody is looking at. Feature
 * 13 gives the client the calendar view of the same data, and any day they
 * moved shows up here too — both screens read one overlay, so neither can
 * describe a week the other does not.
 */
export function ScheduleList({
  entries,
  lang,
  copy,
}: {
  entries: ScheduleEntry[];
  lang: Locale;
  copy: ClientsCopy;
}) {
  const detail = copy.detail;
  const tag = localeTags[lang];

  if (entries.length === 0) {
    return (
      <Surface tone="bare" className="p-5">
        <p className="text-[13px] text-ink-400">{detail.scheduleEmpty}</p>
      </Surface>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const { plan } = entry;
        const outside = plan.kind === "before" || plan.kind === "after";
        const missed =
          plan.kind === "workout" && entry.isPast && !entry.matched && entry.done === 0;

        return (
          <li
            key={plan.day}
            className={cn(
              "flex items-center gap-3 rounded-control border px-3 py-2.5",
              entry.isToday
                ? "border-brand-500/30 bg-brand-500/8"
                : "border-white/6 bg-white/2",
              outside && "opacity-45",
            )}
          >
            <div className="w-11 shrink-0 text-center">
              <p className="text-[10px] uppercase tracking-[0.1em] text-ink-500">
                {formatWeekday(plan.day, tag)}
              </p>
              <p
                className={cn(
                  "text-[15px] font-semibold",
                  entry.isToday ? "text-brand-200" : "text-ink-200",
                )}
              >
                {formatDayNumber(plan.day, tag)}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-ink-100">
                {plan.kind === "workout"
                  ? translate(plan.workoutTitle, lang) || detail.kinds.workout
                  : detail.kinds[plan.kind]}
              </p>

              <p className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-500">
                {plan.weekIndex !== null && plan.dayIndex !== null ? (
                  <span>
                    {(plan.weekLabel ? translate(plan.weekLabel, lang) : "") ||
                      `${plan.weekIndex + 1}·${plan.dayIndex + 1}`}
                  </span>
                ) : null}

                {entry.isToday ? (
                  <span className="text-brand-300">{detail.today}</span>
                ) : null}

                {/* Said out loud rather than shown only as a shifted row: the
                    coach wrote the program, so a day that is not where they
                    put it needs to name who moved it. */}
                {entry.movedFrom ? (
                  <span className="text-ink-400">
                    {fill(detail.movedFrom, {
                      date: formatDay(entry.movedFrom, tag),
                    })}
                  </span>
                ) : null}

                {entry.movedTo ? (
                  <span className="text-ink-400">
                    {fill(detail.movedTo, {
                      date: formatDay(entry.movedTo, tag),
                    })}
                  </span>
                ) : null}

                {plan.note ? (
                  <span className="truncate text-ink-400">
                    {translate(plan.note, lang)}
                  </span>
                ) : null}
              </p>
            </div>

            <Marker
              entry={entry}
              missed={missed}
              label={
                entry.matched
                  ? detail.doneMatched
                  : entry.done > 0
                    ? detail.doneOther
                    : missed
                      ? detail.missed
                      : null
              }
              rest={plan.kind === "rest"}
            />
          </li>
        );
      })}
    </ul>
  );
}

function Marker({
  entry,
  missed,
  label,
  rest,
}: {
  entry: ScheduleEntry;
  missed: boolean;
  label: string | null;
  rest: boolean;
}) {
  if (entry.matched || entry.done > 0) {
    return (
      <span
        title={label ?? undefined}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-full border",
          entry.matched
            ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-200"
            : "border-white/12 bg-white/6 text-ink-300",
        )}
      >
        {entry.matched ? <Check className="size-4" /> : <Dot className="size-5" />}
      </span>
    );
  }

  if (missed) {
    return (
      <span
        title={label ?? undefined}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10 text-rose-300"
      >
        <Circle className="size-3.5" />
      </span>
    );
  }

  if (rest) {
    return (
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-white/8 text-ink-500">
        <Moon className="size-3.5" />
      </span>
    );
  }

  return <span className="size-7 shrink-0" aria-hidden />;
}
