"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Clock, Play, X } from "lucide-react";

import { translate } from "@/db/schema/i18n";
import { Button, ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";
import { fill, type RunnerDictionary } from "@/lib/runner/dictionary";
import {
  finishRunnerSession,
  logRunnerSet,
  quitRunnerSession,
  startRunnerSession,
} from "@/lib/runner/actions";
import {
  estimateMinutes,
  formatClock,
  resumeIndex,
} from "@/lib/runner/timeline";
import type {
  ExerciseStep as ExerciseStepType,
  RunnerPlan,
  RunnerSessionState,
  RunnerTimeline,
} from "@/lib/runner/types";
import { cn } from "@/lib/utils";

import { ExerciseStep } from "./exercise-step";
import { RestStep } from "./rest-step";
import { RunnerSummary } from "./runner-summary";
import type { SetValue } from "./set-logger";
import { useElapsed, useWakeLock } from "./use-timer";

/**
 * The workout, from Start to the summary.
 *
 * Two rules shape everything here:
 *
 * 1. **The workout never waits for the network.** Every set is sent as it
 *    happens and the runner moves on without looking — a set that fails to
 *    save shows a quiet marker, and the totals are recomputed server-side from
 *    whatever landed when the session is closed out. A spinner between sets
 *    would be felt in the gym; a missing row would not.
 *
 * 2. **The timeline is the state.** The step index is the whole position in
 *    the workout, so resuming after a reload is one number derived from which
 *    step keys are already in the log. See `buildTimeline`.
 */

type Phase = "ready" | "running" | "summary";

type Entry = { value: SetValue; skipped: boolean };

export function WorkoutRunner({
  lang,
  plan,
  timeline,
  session: initialSession,
  loggingAvailable: initialLoggingAvailable,
  copy,
  backHref,
}: {
  lang: Locale;
  plan: RunnerPlan;
  timeline: RunnerTimeline;
  session: RunnerSessionState;
  loggingAvailable: boolean;
  copy: RunnerDictionary;
  backHref: string;
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("ready");
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(initialSession);
  const [loggingAvailable, setLoggingAvailable] = useState(
    initialLoggingAvailable,
  );
  const [starting, setStarting] = useState(false);
  const [logFailed, setLogFailed] = useState(false);

  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [values, setValues] = useState<Record<string, SetValue>>({});

  const [confirmQuit, setConfirmQuit] = useState(false);
  const [finishedSec, setFinishedSec] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  /** What was entered for this exercise last round, to prefill the next one. */
  const carriedRef = useRef<Record<string, SetValue>>({});

  const startedAtMs = useMemo(
    () => (session.startedAt ? Date.parse(session.startedAt) : null),
    [session.startedAt],
  );
  const elapsed = useElapsed(phase === "running" ? startedAtMs : null);

  useWakeLock(phase === "running");

  const steps = timeline.steps;
  const step = steps[index];
  const running = phase === "running";

  // A pull-to-refresh or a stray back gesture mid-set is a real way to lose a
  // workout. The browser decides whether to honour this; asking is free.
  useEffect(() => {
    if (!running) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [running]);

  const title = translate(plan.title, lang);

  const completedSets = useMemo(
    () => Object.values(entries).filter((entry) => !entry.skipped).length,
    [entries],
  );

  const volume = useMemo(
    () =>
      Object.values(entries).reduce((sum, entry) => {
        if (entry.skipped) return sum;
        const { reps, weight } = entry.value;
        return sum + (reps ?? 0) * (weight ?? 0);
      }, 0),
    [entries],
  );

  const valueFor = useCallback(
    (exerciseStep: ExerciseStepType): SetValue => {
      const stored = values[exerciseStep.key];
      if (stored) return stored;

      const carried =
        carriedRef.current[
          `${exerciseStep.sectionKey}:${exerciseStep.item.key}`
        ];
      if (carried) return { ...carried, metrics: { ...carried.metrics } };

      return { reps: exerciseStep.item.reps, weight: null, metrics: {} };
    },
    [values],
  );

  const start = async () => {
    setStarting(true);

    const result = await startRunnerSession({
      workoutRef: plan.slug,
      workoutTitle: title,
      totalSets: timeline.totalSets,
    });

    if (result.ok) {
      setSession(result.session);
      setIndex(resumeIndex(steps, result.session.loggedKeys));
      // Sets already logged in this session count toward the summary totals,
      // even though this page never saw them happen.
      setEntries((current) => {
        const merged = { ...current };
        for (const key of result.session.loggedKeys) {
          merged[key] ??= {
            value: { reps: null, weight: null, metrics: {} },
            skipped: false,
          };
        }
        return merged;
      });
    } else {
      // No log, but there is still a workout to do.
      setLoggingAvailable(false);
      setSession({ id: null, startedAt: new Date().toISOString(), loggedKeys: [] });
      setIndex(0);
    }

    setStarting(false);
    setPhase("running");
  };

  const advance = useCallback(
    (from: number) => {
      const next = from + 1;
      if (next >= steps.length) {
        setFinishedSec(
          startedAtMs === null ? 0 : Math.round((Date.now() - startedAtMs) / 1000),
        );
        setPhase("summary");
        return;
      }
      setIndex(next);
    },
    [steps.length, startedAtMs],
  );

  const record = useCallback(
    (exerciseStep: ExerciseStepType, value: SetValue, skipped: boolean) => {
      setEntries((current) => ({
        ...current,
        [exerciseStep.key]: { value, skipped },
      }));

      if (!skipped) {
        carriedRef.current[
          `${exerciseStep.sectionKey}:${exerciseStep.item.key}`
        ] = value;
      }

      if (!session.id) return;

      const { item } = exerciseStep;

      // Sent, not awaited — see the note at the top of the file.
      void logRunnerSet({
        sessionId: session.id,
        stepKey: exerciseStep.key,
        exerciseId: item.exerciseId,
        exerciseTitle: translate(item.title, lang),
        section: exerciseStep.sectionKind,
        round: exerciseStep.round,
        position: exerciseStep.setNumber,
        mode: item.mode,
        reps: item.mode === "reps" ? value.reps : null,
        durationSec: item.mode === "time" ? item.durationSec : null,
        weight: value.weight,
        metrics: value.metrics,
        rpe: null,
        skipped,
      })
        .then((result) => {
          if (!result.ok) setLogFailed(true);
        })
        .catch(() => setLogFailed(true));
    },
    [lang, session.id],
  );

  const finish = async (rpe: number | null, notes: string | null) => {
    if (!session.id) {
      setSaved(true);
      return;
    }

    setSaving(true);
    setSaveFailed(false);

    const result = await finishRunnerSession({
      sessionId: session.id,
      elapsedSec: finishedSec,
      rpe,
      notes,
    });

    setSaving(false);

    if (result.ok) {
      setSaved(true);
      router.refresh();
    } else {
      setSaveFailed(true);
    }
  };

  const quit = async () => {
    if (session.id) {
      await quitRunnerSession({
        sessionId: session.id,
        elapsedSec: Math.round(elapsed),
      });
    }
    router.push(backHref);
  };

  /* ---------------------------------------------------------------- ready */

  if (phase === "ready") {
    const resumeAt = resumeIndex(steps, session.loggedKeys);
    const resuming = session.loggedKeys.length > 0;
    const resumeSet =
      steps[resumeAt]?.kind === "exercise"
        ? (steps[resumeAt] as ExerciseStepType).setNumber
        : timeline.totalSets;

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
            {title}
          </h1>
          {plan.summary ? (
            <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-300">
              {translate(plan.summary, lang)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-brand-500/25 bg-brand-500/12 px-3 py-1.5 text-[11px] font-semibold text-brand-200">
            {copy.difficulty[plan.difficulty]}
          </span>
          <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-ink-300">
            {timeline.totalSets} {copy.ready.sets}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-ink-300">
            <Clock className="size-3.5" />
            {fill(copy.ready.estimate, {
              min: estimateMinutes(timeline.estimatedSec),
            })}
          </span>
        </div>

        <Surface tone="strong" edge className="flex flex-col gap-4 p-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            {copy.ready.overview}
          </h2>

          <ul className="flex flex-col gap-3">
            {plan.sections
              .filter((section) => section.items.length > 0)
              .map((section) => (
                <li key={section.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[14px] font-semibold text-ink-100">
                      {section.title
                        ? translate(section.title, lang)
                        : copy.section[section.kind]}
                    </span>
                    <span className="text-[12px] text-ink-500">
                      {section.rounds > 1
                        ? fill(copy.ready.rounds, { n: section.rounds })
                        : copy.ready.oneRound}
                    </span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-ink-400">
                    {section.items
                      .map((item) => translate(item.title, lang))
                      .join(" · ")}
                  </p>
                </li>
              ))}
          </ul>
        </Surface>

        {!loggingAvailable ? (
          <p className="text-[13px] leading-relaxed text-warn">
            {copy.ready.loggingOff}
          </p>
        ) : null}

        {resuming ? (
          <p className="text-[13px] leading-relaxed text-ink-400">
            {fill(copy.ready.resumeHint, { n: resumeSet })}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={starting}
            onClick={start}
          >
            <Play className="size-4.5" />
            {resuming ? copy.ready.resume : copy.ready.start}
          </Button>
          <ButtonLink href={backHref} variant="ghost" size="lg">
            <ChevronLeft className="size-4" />
            {copy.ready.back}
          </ButtonLink>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------- summary */

  if (phase === "summary") {
    return (
      <RunnerSummary
        copy={copy}
        elapsedSec={finishedSec}
        completedSets={completedSets}
        totalSets={timeline.totalSets}
        volume={volume}
        saving={saving}
        saved={saved}
        failed={saveFailed}
        loggingAvailable={loggingAvailable && session.id !== null}
        backHref={backHref}
        onSave={finish}
      />
    );
  }

  /* -------------------------------------------------------------- running */

  const progress =
    timeline.totalSets > 0
      ? Math.min(100, (Object.keys(entries).length / timeline.totalSets) * 100)
      : 0;

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-[15px] tabular-nums text-ink-200">
            <Clock className="size-4 text-ink-500" />
            {formatClock(elapsed)}
          </div>
          <button
            type="button"
            onClick={() => setConfirmQuit(true)}
            className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
          >
            <X className="size-4" />
            {copy.step.quit}
          </button>
        </div>

        <div
          className="h-1 w-full overflow-hidden rounded-full bg-white/8"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-brand-500 to-glow transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {step.kind === "exercise" ? (
        <ExerciseStep
          key={step.key}
          step={step}
          locale={lang}
          copy={copy}
          totalSets={timeline.totalSets}
          value={valueFor(step)}
          onValueChange={(value) =>
            setValues((current) => ({ ...current, [step.key]: value }))
          }
          onDone={() => {
            record(step, valueFor(step), false);
            advance(index);
          }}
          onSkip={() => {
            record(step, valueFor(step), true);
            advance(index);
          }}
        />
      ) : (
        <RestStep
          key={step.key}
          step={step}
          locale={lang}
          copy={copy}
          onDone={() => advance(index)}
        />
      )}

      {logFailed ? (
        <p className="text-[12px] text-warn">{copy.log.saveFailed}</p>
      ) : null}

      {confirmQuit ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-void/80 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <Surface
            tone="strong"
            edge
            className={cn("w-full max-w-md p-6 pb-safe", "animate-rise")}
          >
            <h2 className="text-lg font-semibold text-ink-50">
              {copy.quit.title}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
              {copy.quit.body}
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setConfirmQuit(false)}
              >
                {copy.quit.cancel}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-danger hover:text-danger"
                onClick={quit}
              >
                {copy.quit.confirm}
              </Button>
            </div>
          </Surface>
        </div>
      ) : null}
    </div>
  );
}
