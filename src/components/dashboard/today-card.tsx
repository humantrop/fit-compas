import { ArrowRight, CalendarClock, CircleCheck, Moon, PlayCircle } from "lucide-react";

import { translate } from "@/db/schema/i18n";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import { fill } from "@/lib/dashboard/copy";
import type { OpenSession, ScheduledDay } from "@/lib/dashboard/types";
import type { Locale } from "@/lib/i18n/config";
import type { RunnerPlanSummary } from "@/lib/runner/types";

/**
 * The one card that answers "what do I do now".
 *
 * Five states, resolved in this order:
 *
 *   1. a session left running — the most urgent thing on the screen, because
 *      the alternative is a workout silently abandoned halfway;
 *   2. today already trained;
 *   3. what the plan says for today — a workout, or a rest day;
 *   4. no plan assigned yet, which is every client until feature 13 ships.
 *
 * Rest and "nothing scheduled" are different cards on purpose. Telling someone
 * to rest when their coach never said so is a training instruction the app
 * invented.
 */
export function TodayCard({
  lang,
  copy,
  dateLabel,
  open,
  doneToday,
  scheduled,
  schedulePending,
  suggestion,
}: {
  lang: Locale;
  copy: DashboardCopy["today"];
  dateLabel: string;
  open: OpenSession | null;
  doneToday: boolean;
  scheduled: ScheduledDay | null;
  schedulePending: boolean;
  suggestion: RunnerPlanSummary | null;
}) {
  const shell = (props: {
    eyebrow: string;
    icon: React.ReactNode;
    title: string;
    body?: string | null;
    context?: string | null;
    action?: React.ReactNode;
  }) => (
    <Surface tone="strong" edge className="flex flex-col gap-5 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <Eyebrow>{props.eyebrow}</Eyebrow>
        <span className="text-[12px] font-medium text-ink-500">{dateLabel}</span>
      </div>

      <div className="flex items-start gap-4">
        <span className="mt-0.5 text-brand-300">{props.icon}</span>
        <div className="min-w-0">
          {props.context ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {props.context}
            </p>
          ) : null}
          <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            {props.title}
          </h2>
          {props.body ? (
            <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-300">
              {props.body}
            </p>
          ) : null}
        </div>
      </div>

      {props.action}
    </Surface>
  );

  if (open) {
    return shell({
      eyebrow: copy.resumeEyebrow,
      icon: <PlayCircle className="size-6" />,
      title: open.workoutTitle || open.workoutRef,
      body: fill(copy.resumeProgress, {
        done: open.completedSets,
        total: open.totalSets,
      }),
      action: (
        <ButtonLink href={`/${lang}/workout/${open.workoutRef}`} size="lg">
          {copy.resume}
          <ArrowRight className="size-4.5" />
        </ButtonLink>
      ),
    });
  }

  if (doneToday) {
    return shell({
      eyebrow: copy.doneEyebrow,
      icon: <CircleCheck className="size-6 text-success" />,
      title: copy.doneTitle,
      body: copy.doneBody,
      action: (
        <ButtonLink href={`/${lang}/workout`} variant="secondary">
          {copy.browse}
        </ButtonLink>
      ),
    });
  }

  if (scheduled?.kind === "rest") {
    return shell({
      eyebrow: copy.scheduledEyebrow,
      icon: <Moon className="size-6" />,
      title: copy.restTitle,
      body: copy.restBody,
      context: scheduled.context ? translate(scheduled.context, lang) : null,
    });
  }

  if (scheduled?.kind === "workout" && scheduled.workoutRef) {
    return shell({
      eyebrow: copy.scheduledEyebrow,
      icon: <PlayCircle className="size-6" />,
      title: translate(scheduled.title, lang),
      body: scheduled.summary ? translate(scheduled.summary, lang) : null,
      context: scheduled.context ? translate(scheduled.context, lang) : null,
      action: (
        <ButtonLink href={`/${lang}/workout/${scheduled.workoutRef}`} size="lg">
          {copy.start}
          <ArrowRight className="size-4.5" />
        </ButtonLink>
      ),
    });
  }

  // No plan assigned. Offer the shortest path to training anyway rather than
  // an empty card — the seam that fills this in is feature 13.
  return shell({
    eyebrow: copy.eyebrow,
    icon: <CalendarClock className="size-6" />,
    title: schedulePending ? copy.pendingTitle : copy.openTitle,
    body: schedulePending ? copy.pendingBody : copy.openBody,
    action: suggestion ? (
      <ButtonLink href={`/${lang}/workout/${suggestion.slug}`} size="lg">
        {copy.start}
        <ArrowRight className="size-4.5" />
      </ButtonLink>
    ) : (
      <ButtonLink href={`/${lang}/workout`} variant="secondary">
        {copy.browse}
      </ButtonLink>
    ),
  });
}
