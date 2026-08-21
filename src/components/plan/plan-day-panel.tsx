"use client";

import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Info,
  Moon,
  RotateCcw,
} from "lucide-react";
import { useActionState } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { formatDayLong, formatRelativeDay } from "@/lib/clients/format";
import { shiftDay } from "@/lib/clients/schedule";
import type { Locale } from "@/lib/i18n/config";
import {
  markDayDoneAction,
  moveDayAction,
  undoMoveAction,
  unmarkDayAction,
} from "@/lib/plan/actions";
import { fill, type PlanCopy } from "@/lib/plan/copy";
import { MOVE_WINDOW_DAYS } from "@/lib/plan/moves";
import { PLAN_IDLE, type PlanDayView, type PlanState } from "@/lib/plan/types";
import { cn } from "@/lib/utils";

/**
 * The day the calendar has open, and the three things that can be done to it.
 *
 * The only client component on the screen: everything else is a link, and the
 * month grid keeps its state in the URL. Here there are forms, and each one
 * carries its own `useActionState` so a failed move does not blank the mark
 * button's message and vice versa.
 *
 * The move control is a plain date field rather than a list of the days that
 * would be accepted. Enumerating those on the screen would be a second
 * implementation of `canMove()`, and the two would drift — so the field takes
 * a date, the server answers, and the answer is shown.
 */
export function PlanDayPanel({
  day,
  lang,
  localeTag,
  today,
  runnerReady,
  copy,
}: {
  day: PlanDayView;
  lang: Locale;
  localeTag: string;
  today: string;
  /** False while the runner still serves the built-in demo plans. */
  runnerReady: boolean;
  copy: PlanCopy;
}) {
  const text = copy.day;
  const kind = day.plan.kind;
  const done = day.matched || day.done > 0;

  const title =
    kind === "workout"
      ? translate(day.plan.workoutTitle, lang) || text.kinds.workout
      : text.kinds[kind];

  const body =
    kind === "rest"
      ? text.restBody
      : kind === "open"
        ? text.openBody
        : kind === "before"
          ? text.beforeBody
          : kind === "after"
            ? text.afterBody
            : null;

  const context =
    day.plan.weekIndex !== null && day.plan.dayIndex !== null
      ? fill(text.context, {
          week: day.plan.weekIndex + 1,
          day: day.plan.dayIndex + 1,
        })
      : null;

  return (
    <Surface tone="strong" edge className="flex flex-col gap-5 p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-semibold text-ink-100">
          {formatDayLong(day.day, localeTag)}
        </h2>
        <p className="text-[12px] font-medium text-ink-500">
          {day.isToday
            ? copy.calendar.today
            : formatRelativeDay(day.day, today, localeTag)}
        </p>
      </div>

      <div className="flex items-start gap-4">
        <span className="mt-0.5 text-brand-300">
          {done ? (
            <CircleCheck className="size-6 text-success" />
          ) : kind === "rest" ? (
            <Moon className="size-6" />
          ) : (
            <CalendarClock className="size-6" />
          )}
        </span>

        <div className="min-w-0">
          {context ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {context}
            </p>
          ) : null}

          <h3 className="text-xl font-bold tracking-tight text-ink-50 sm:text-2xl">
            {title}
          </h3>

          {body ? (
            <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-300">
              {body}
            </p>
          ) : null}

          {day.plan.note ? (
            <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-ink-400">
              {translate(day.plan.note, lang)}
            </p>
          ) : null}
        </div>
      </div>

      <Badges day={day} copy={copy} localeTag={localeTag} />

      {kind === "workout" && day.plan.workoutSlug ? (
        <div className="flex flex-col gap-4">
          {runnerReady ? (
            <ButtonLink
              href={`/${lang}/workout/${day.plan.workoutSlug}`}
              size="lg"
              className="self-start"
            >
              {text.start}
              <ArrowRight className="size-4.5" />
            </ButtonLink>
          ) : (
            <p className="flex items-start gap-2.5 rounded-control border border-white/8 bg-white/3 p-3.5 text-[13px] leading-relaxed text-ink-400">
              <Info className="mt-0.5 size-4 shrink-0" />
              {text.runnerPending}
            </p>
          )}

          <MarkForm day={day} today={today} copy={copy} />
          <MoveForm day={day} today={today} localeTag={localeTag} copy={copy} />
        </div>
      ) : null}

      {kind !== "workout" && (day.movedFrom || day.movedTo) ? (
        <UndoMoveForm day={day} copy={copy} />
      ) : null}
    </Surface>
  );
}

/** What is true about the day, as short chips rather than a paragraph. */
function Badges({
  day,
  copy,
  localeTag,
}: {
  day: PlanDayView;
  copy: PlanCopy;
  localeTag: string;
}) {
  const text = copy.day;
  const chips: { label: string; tone: "good" | "muted" | "bad" }[] = [];

  if (day.movedFrom) {
    chips.push({
      label: fill(text.movedFrom, {
        date: formatDayLong(day.movedFrom, localeTag),
      }),
      tone: "muted",
    });
  }

  if (day.movedTo) {
    chips.push({
      label: fill(text.movedTo, {
        date: formatDayLong(day.movedTo, localeTag),
      }),
      tone: "muted",
    });
  }

  if (day.matched) {
    // A tick and a logged workout are both "done", and saying which is the
    // difference between a record and a claim.
    chips.push({
      label: day.selfReported ? text.doneSelf : text.doneMatched,
      tone: "good",
    });
  } else if (day.done > 0) {
    chips.push({ label: text.doneOther, tone: "muted" });
  } else if (day.plan.kind === "workout" && day.isPast) {
    chips.push({ label: text.missed, tone: "bad" });
  }

  if (chips.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li
          key={chip.label}
          className={cn(
            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]",
            chip.tone === "good" &&
              "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
            chip.tone === "muted" && "border-white/10 bg-white/5 text-ink-300",
            chip.tone === "bad" && "border-rose-400/25 bg-rose-400/10 text-rose-300",
          )}
        >
          {chip.label}
        </li>
      ))}
    </ul>
  );
}

function ErrorLine({ state, copy }: { state: PlanState; copy: PlanCopy }) {
  if (state.status !== "error" || !state.code) return null;

  return (
    <p role="alert" className="text-[13px] text-rose-300">
      {copy.errors[state.code]}
    </p>
  );
}

/**
 * Tick the day off, or take the tick back.
 *
 * Only offered on a day that has been — you cannot have trained tomorrow — and
 * the undo only appears for a mark this screen made. A session the runner
 * recorded is not ours to delete from here.
 */
function MarkForm({
  day,
  today,
  copy,
}: {
  day: PlanDayView;
  today: string;
  copy: PlanCopy;
}) {
  const [state, action, pending] = useActionState(
    day.selfReported ? unmarkDayAction : markDayDoneAction,
    PLAN_IDLE,
  );

  if (day.day > today) return null;
  if (day.matched && !day.selfReported) return null;

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="day" value={day.day} />

      <Button
        type="submit"
        variant="secondary"
        className="self-start"
        disabled={pending}
      >
        {pending ? (
          copy.day.saving
        ) : day.selfReported ? (
          <>
            <RotateCcw className="size-4" />
            {copy.day.unmark}
          </>
        ) : (
          <>
            <CircleCheck className="size-4" />
            {copy.day.markDone}
          </>
        )}
      </Button>

      <ErrorLine state={state} copy={copy} />
    </form>
  );
}

/**
 * Move the session to another day.
 *
 * `min` and `max` on the field are the same window the server enforces,
 * measured from where the program put the session rather than from where it
 * currently sits — otherwise each move would reset the budget and a session
 * could walk out of the plan three weeks at a time.
 */
function MoveForm({
  day,
  today,
  localeTag,
  copy,
}: {
  day: PlanDayView;
  today: string;
  localeTag: string;
  copy: PlanCopy;
}) {
  const [state, action, pending] = useActionState(moveDayAction, PLAN_IDLE);
  const text = copy.day;

  const origin = day.movedFrom ?? day.day;
  const earliest = shiftDay(origin, -MOVE_WINDOW_DAYS);
  const min = earliest > today ? earliest : today;
  const max = shiftDay(origin, MOVE_WINDOW_DAYS);
  const suggested = shiftDay(day.day, 1);

  return (
    <div className="flex flex-col gap-3 border-t border-white/8 pt-4">
      <h4 className="text-[13px] font-semibold text-ink-200">
        {text.moveHeading}
      </h4>

      <form action={action} className="flex flex-wrap items-end gap-2.5">
        <input type="hidden" name="day" value={day.day} />

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
            {text.moveLabel}
          </span>
          <input
            type="date"
            name="toDay"
            required
            min={min}
            max={max}
            defaultValue={suggested > max ? max : suggested}
            className={cn(fieldControl, "w-44")}
          />
        </label>

        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? text.saving : text.move}
        </Button>
      </form>

      <p className="text-[12px] text-ink-500">
        {text.moveHint}
        {/* The accepted range spelled out for a reader who cannot see the
            picker greying days out. */}
        <span className="sr-only">
          {" "}
          {formatDayLong(min, localeTag)} – {formatDayLong(max, localeTag)}
        </span>
      </p>

      <ErrorLine state={state} copy={copy} />

      {/* A sibling, never nested: a form inside a form is not a form. */}
      {day.movedFrom ? <UndoMoveForm day={day} copy={copy} /> : null}
    </div>
  );
}

/** The vacated end of a move: the day the session left. */
function UndoMoveForm({ day, copy }: { day: PlanDayView; copy: PlanCopy }) {
  const [state, action, pending] = useActionState(undoMoveAction, PLAN_IDLE);

  return (
    <form action={action} className="flex flex-col gap-2 border-t border-white/8 pt-4">
      <input type="hidden" name="day" value={day.day} />

      <Button type="submit" variant="ghost" className="self-start" disabled={pending}>
        <RotateCcw className="size-4" />
        {pending ? copy.day.saving : copy.day.undoMove}
      </Button>

      <ErrorLine state={state} copy={copy} />
    </form>
  );
}
