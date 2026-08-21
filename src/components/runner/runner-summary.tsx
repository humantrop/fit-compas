"use client";

import { useState } from "react";
import { Check, Clock, Dumbbell, Layers } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { RunnerDictionary } from "@/lib/runner/dictionary";
import { formatClock } from "@/lib/runner/timeline";
import { cn } from "@/lib/utils";

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Surface className="flex flex-col gap-2 p-5">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {icon}
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-ink-50">
        {value}
        {unit ? (
          <span className="ml-1 text-[13px] font-medium text-ink-400">{unit}</span>
        ) : null}
      </span>
    </Surface>
  );
}

/**
 * The screen after the last set.
 *
 * Session RPE and the note are asked for here rather than per set: answered
 * once at the end they get answered, asked after every set they get tapped
 * through. What the sets themselves recorded is already saved by this point —
 * this form only closes the session out.
 */
export function RunnerSummary({
  copy,
  elapsedSec,
  completedSets,
  totalSets,
  volume,
  saving,
  saved,
  failed,
  loggingAvailable,
  backHref,
  onSave,
}: {
  copy: RunnerDictionary;
  elapsedSec: number;
  completedSets: number;
  totalSets: number;
  volume: number;
  saving: boolean;
  saved: boolean;
  failed: boolean;
  loggingAvailable: boolean;
  backHref: string;
  onSave: (rpe: number | null, notes: string | null) => void;
}) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50">
          {copy.summary.title}
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
          {loggingAvailable ? copy.summary.subtitle : copy.summary.notSaved}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={<Clock className="size-3.5" />}
          label={copy.summary.duration}
          value={formatClock(elapsedSec)}
        />
        <Stat
          icon={<Layers className="size-3.5" />}
          label={copy.summary.sets}
          value={`${completedSets}/${totalSets}`}
        />
        <Stat
          icon={<Dumbbell className="size-3.5" />}
          label={copy.summary.volume}
          value={volume > 0 ? String(Math.round(volume)) : "—"}
          unit={volume > 0 ? copy.summary.volumeUnit : undefined}
        />
      </div>

      {loggingAvailable && !saved ? (
        <Surface tone="strong" edge className="flex flex-col gap-5 p-6">
          <div>
            <p className="text-[13px] font-medium text-ink-300">
              {copy.summary.rpe}
            </p>
            <div className="mt-3 grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRpe(value === rpe ? null : value)}
                  aria-pressed={value === rpe}
                  className={cn(
                    "h-11 rounded-control border font-mono text-[13px] font-semibold transition-all active:scale-[0.97]",
                    value === rpe
                      ? "border-brand-500/60 bg-brand-500/20 text-brand-100"
                      : "border-white/10 bg-white/4 text-ink-400 hover:bg-white/8",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.summary.notes}
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={copy.summary.notesPlaceholder}
              className="w-full resize-none rounded-control border border-white/10 bg-white/4 px-4 py-3 text-[15px] text-ink-100 outline-none transition-all placeholder:text-ink-500 hover:border-white/16 focus:border-brand-500/60 focus:bg-white/6 focus:ring-4 focus:ring-brand-500/15"
            />
          </label>

          {failed ? (
            <p className="text-[13px] text-danger">{copy.summary.saveFailed}</p>
          ) : null}

          <Button
            type="button"
            size="lg"
            disabled={saving}
            onClick={() => onSave(rpe, notes.trim() === "" ? null : notes.trim())}
          >
            <Check className="size-4.5" />
            {saving ? copy.summary.saving : copy.summary.save}
          </Button>
        </Surface>
      ) : null}

      <ButtonLink href={backHref} variant="secondary" size="lg">
        {copy.summary.backToList}
      </ButtonLink>
    </div>
  );
}
