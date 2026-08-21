"use client";

import { Check, Pause, Play, SkipForward } from "lucide-react";

import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import { fill, type RunnerDictionary } from "@/lib/runner/dictionary";
import type { ExerciseStep as Step } from "@/lib/runner/types";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

import { RunnerRing } from "./runner-ring";
import { RunnerVideo } from "./runner-video";
import { SetLogger, type SetValue } from "./set-logger";
import { useCountdown } from "./use-timer";

/** A short buzz when a timed set runs out. Absent on desktop, silent if denied. */
function buzz() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(180);
    } catch {
      // Some browsers require a user gesture. Not worth reacting to.
    }
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-ink-300">
      {children}
    </span>
  );
}

export function ExerciseStep({
  step,
  locale,
  copy,
  value,
  onValueChange,
  onDone,
  onSkip,
  totalSets,
}: {
  step: Step;
  locale: Locale;
  copy: RunnerDictionary;
  value: SetValue;
  onValueChange: (value: SetValue) => void;
  onDone: () => void;
  onSkip: () => void;
  totalSets: number;
}) {
  const { item } = step;
  const timed = item.mode === "time";
  const target = item.durationSec ?? 0;

  // Timed sets start themselves. Standing there tapping Start before every
  // interval is the difference between a runner you can use in a circuit and
  // one you fight with.
  const timer = useCountdown(target, timed, () => {
    buzz();
    onDone();
  });

  const title = translate(item.title, locale);
  const cues = item.cues ? translate(item.cues, locale) : "";
  const sectionTitle = step.sectionTitle
    ? translate(step.sectionTitle, locale)
    : copy.section[step.sectionKind];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-brand-500/25 bg-brand-500/12 px-3 py-1.5 text-[11px] font-semibold text-brand-200">
            {sectionTitle}
          </span>
          {step.totalRounds > 1 ? (
            <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-semibold text-ink-300">
              {fill(copy.step.round, {
                current: step.round,
                total: step.totalRounds,
              })}
            </span>
          ) : null}
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {fill(copy.step.set, { current: step.setNumber, total: totalSets })}
        </span>
      </div>

      <RunnerVideo
        key={item.videoUrl ?? item.key}
        src={item.videoUrl}
        poster={item.posterUrl}
        title={title}
        emptyLabel={copy.step.noVideo}
      />

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
          {title}
        </h2>
        {cues ? (
          <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{cues}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!timed && item.reps !== null ? (
          <Chip>
            <strong className="font-mono text-[13px] text-ink-100">
              {item.reps}
            </strong>
            {copy.step.reps}
          </Chip>
        ) : null}
        {item.isUnilateral ? <Chip>{copy.step.perSide}</Chip> : null}
        {item.tempo ? (
          <Chip>
            {copy.step.tempo}
            <strong className="font-mono text-[13px] text-ink-100">
              {item.tempo}
            </strong>
          </Chip>
        ) : null}
        {item.rpe !== null ? (
          <Chip>
            {copy.step.rpe}
            <strong className="font-mono text-[13px] text-ink-100">
              {item.rpe}
            </strong>
          </Chip>
        ) : null}
      </div>

      {timed ? (
        <Surface className="flex flex-col items-center gap-4 p-6">
          <RunnerRing remaining={timer.remaining} total={target} />
          <Button
            type="button"
            variant="secondary"
            onClick={timer.running ? timer.pause : timer.start}
          >
            {timer.running ? (
              <>
                <Pause className="size-4" />
                {copy.step.pause}
              </>
            ) : (
              <>
                <Play className="size-4" />
                {timer.remaining === target ? copy.step.start : copy.step.continue}
              </>
            )}
          </Button>
        </Surface>
      ) : null}

      <Surface className="p-5">
        <SetLogger
          mode={item.mode}
          metrics={item.metrics}
          value={value}
          onChange={onValueChange}
          copy={copy.log}
        />
      </Surface>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="flex-1"
          onClick={onSkip}
        >
          <SkipForward className="size-4" />
          {copy.step.skip}
        </Button>
        <Button type="button" size="lg" className="flex-[2]" onClick={onDone}>
          <Check className="size-4.5" />
          {copy.step.done}
        </Button>
      </div>
    </div>
  );
}
