"use client";

import { Pause, Play, Plus, SkipForward } from "lucide-react";

import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { RunnerDictionary } from "@/lib/runner/dictionary";
import type { RestStep as Step } from "@/lib/runner/types";
import { Button } from "@/components/ui/button";

import { RunnerRing } from "./runner-ring";
import { useCountdown } from "./use-timer";

/**
 * The rest between sets, rounds or blocks.
 *
 * Deliberately its own screen rather than a strip on the exercise screen: the
 * rest is prescribed work, and the up-next line is what lets you set up the
 * next exercise while the clock runs instead of discovering it at zero.
 */
export function RestStep({
  step,
  locale,
  copy,
  onDone,
}: {
  step: Step;
  locale: Locale;
  copy: RunnerDictionary;
  onDone: () => void;
}) {
  const timer = useCountdown(step.durationSec, true, onDone);

  const next = step.nextTitle ? translate(step.nextTitle, locale) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
        {copy.rest[step.scope]}
      </p>

      <RunnerRing
        remaining={timer.remaining}
        total={step.durationSec}
        tone="glow"
        label={copy.rest.title}
      />

      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          {copy.rest.next}
        </p>
        <p className="mt-1 text-lg font-semibold text-ink-100">
          {next ?? copy.rest.last}
        </p>
      </div>

      <div className="flex w-full max-w-sm gap-3">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={() => timer.extend(15)}
        >
          <Plus className="size-4" />
          {copy.rest.add}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={timer.running ? timer.pause : timer.start}
          aria-label={timer.running ? copy.step.pause : copy.step.continue}
        >
          {timer.running ? (
            <Pause className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
        </Button>
        <Button type="button" size="lg" className="flex-1" onClick={onDone}>
          <SkipForward className="size-4" />
          {copy.rest.skip}
        </Button>
      </div>
    </div>
  );
}
