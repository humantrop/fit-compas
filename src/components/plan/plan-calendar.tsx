import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/surface";
import { toDate } from "@/lib/clients/schedule";
import type { PlanCopy } from "@/lib/plan/copy";
import { monthLabel, monthOf, shiftMonth, type MonthKey } from "@/lib/plan/month";
import type { PlanDayView } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

/**
 * The month, Monday first.
 *
 * A month grid rather than the list the trainer's screen uses, and the
 * difference is what each side is asking. A coach scans a column of
 * consecutive days to see whether someone is keeping up; a client wants to
 * find next Thursday, which is a spatial question and reads off a grid.
 *
 * Every cell is a link, and the whole screen's state — which month, which day
 * is open — lives in the query string. So a plan someone is looking at is a
 * link they can send, Back works, and this stays a server component with no
 * state to lose on a reload.
 */
export function PlanCalendar({
  days,
  month,
  selected,
  today,
  basePath,
  localeTag,
  copy,
}: {
  /** Whole weeks, so the grid is a rectangle — see `monthGridRange`. */
  days: PlanDayView[];
  month: MonthKey;
  selected: string;
  today: string;
  basePath: string;
  localeTag: string;
  copy: PlanCopy;
}) {
  const href = (day: string) =>
    `${basePath}?m=${monthOf(day)}&d=${day}`;

  const monthHref = (target: MonthKey) => `${basePath}?m=${target}&d=${selected}`;

  const hasRest = days.some((day) => day.plan.kind === "rest");
  const hasMoved = days.some((day) => day.movedFrom || day.movedTo);

  return (
    <Surface className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={monthHref(shiftMonth(month, -1))}
          aria-label={copy.calendar.previous}
          className="grid size-9 place-items-center rounded-control text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
        >
          <ChevronLeft className="size-4.5" />
        </Link>

        <div className="flex flex-col items-center">
          <h2 className="text-[15px] font-semibold capitalize text-ink-100">
            {monthLabel(month, localeTag)}
          </h2>
          {selected === today && month === monthOf(today) ? null : (
            <Link
              href={href(today)}
              className="text-[11px] font-semibold text-brand-300 transition-colors hover:text-brand-200"
            >
              {copy.calendar.today}
            </Link>
          )}
        </div>

        <Link
          href={monthHref(shiftMonth(month, 1))}
          aria-label={copy.calendar.next}
          className="grid size-9 place-items-center rounded-control text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
        >
          <ChevronRight className="size-4.5" />
        </Link>
      </div>

      {/* One grid, not a list of weeks: the weekday headings have to sit in
          the same seven columns as the cells under them. */}
      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-1.5">
        {copy.calendar.weekdays.map((label) => (
          <span
            key={label}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-500"
          >
            {label}
          </span>
        ))}

        {days.map((day) => (
          <Cell
            key={day.day}
            day={day}
            month={month}
            selected={selected}
            href={href(day.day)}
          />
        ))}
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-500">
        <Legend className="bg-brand-500" label={copy.calendar.legend.done} />
        <Legend className="bg-brand-500/25" label={copy.calendar.legend.workout} />
        {hasRest ? (
          <Legend className="bg-white/12" label={copy.calendar.legend.rest} />
        ) : null}
        {hasMoved ? (
          <Legend
            className="border border-dashed border-brand-400/60"
            label={copy.calendar.legend.moved}
          />
        ) : null}
      </ul>
    </Surface>
  );
}

function Cell({
  day,
  month,
  selected,
  href,
}: {
  day: PlanDayView;
  month: MonthKey;
  selected: string;
  href: string;
}) {
  const inMonth = day.day.startsWith(month);
  const done = day.matched || day.done > 0;
  const planned = day.plan.kind === "workout" && !done;
  const rest = day.plan.kind === "rest";

  // A workout day in the past with nothing logged against it. Shown, not
  // hidden — the calendar is only useful if it can say a day was missed.
  const missed = day.plan.kind === "workout" && day.isPast && !done;

  return (
    <Link
      href={href}
      aria-current={day.isToday ? "date" : undefined}
      className={cn(
        "flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-control border text-[13px] font-semibold tabular-nums transition-colors",
        !inMonth && "opacity-35",
        done && "border-transparent bg-linear-to-b from-brand-400 to-brand-600 text-white",
        !done && planned && !missed && "border-brand-500/30 bg-brand-500/8 text-ink-100",
        !done && missed && "border-rose-400/25 bg-rose-400/8 text-rose-200",
        !done && rest && "border-white/6 bg-white/2 text-ink-500",
        !done && !planned && !rest && "border-white/6 bg-white/2 text-ink-400",
        (day.movedFrom || day.movedTo) && "border-dashed border-brand-400/50",
        day.isToday && "ring-1 ring-brand-400/70 ring-offset-1 ring-offset-base-950",
        day.day === selected && "outline outline-2 outline-brand-300",
        "hover:border-white/20",
      )}
    >
      {toDate(day.day).getUTCDate()}

      {/* One dot rather than a second row of labels: at seven columns on a
          phone there is room for a number and a state, and nothing else. */}
      <span
        aria-hidden
        className={cn(
          "size-1 rounded-full",
          done ? "bg-white/80" : planned ? "bg-brand-300" : "bg-transparent",
        )}
      />
    </Link>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-[4px]", className)} />
      {label}
    </li>
  );
}
