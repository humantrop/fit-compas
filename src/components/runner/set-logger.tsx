"use client";

import { Minus, Plus } from "lucide-react";
import { useId } from "react";

import type { RunnerDictionary } from "@/lib/runner/dictionary";
import type { MetricKind, RunnerMode } from "@/lib/runner/types";
import { cn } from "@/lib/utils";

/**
 * What the user actually did, as opposed to what was prescribed.
 *
 * Prefilled with the target so the common case — you did what it said — is one
 * tap. The controls are big and thumb-first: this is used mid-set, one-handed,
 * with the phone propped against a water bottle.
 */

export type SetValue = {
  reps: number | null;
  weight: number | null;
  metrics: Partial<Record<MetricKind, number>>;
};

const control =
  "h-14 w-full rounded-control border border-white/10 bg-white/4 text-center " +
  "font-mono text-2xl font-semibold tabular-nums text-ink-50 outline-none " +
  "transition-all placeholder:text-ink-500 hover:border-white/16 " +
  "focus:border-brand-500/60 focus:bg-white/6 focus:ring-4 focus:ring-brand-500/15";

function toNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  // Serbian and Russian keyboards put a comma where the decimal point goes.
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  step?: number;
  suffix?: string;
}) {
  const id = useId();

  return (
    <label htmlFor={id} className="flex flex-col gap-2">
      <span className="text-[12px] font-medium text-ink-400">{label}</span>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value === null ? "" : String(value)}
          onChange={(event) => onChange(toNumber(event.target.value))}
          step={step}
          placeholder="—"
          className={cn(control, suffix && "pr-10")}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[12px] text-ink-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const id = useId();
  const nudge = (delta: number) =>
    onChange(Math.max(0, Math.min(999, (value ?? 0) + delta)));

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[12px] font-medium text-ink-400">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="-1"
          className="grid size-14 shrink-0 place-items-center rounded-control border border-white/10 bg-white/4 text-ink-200 transition-colors hover:bg-white/8 active:scale-[0.97]"
        >
          <Minus className="size-5" />
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={value === null ? "" : String(value)}
          onChange={(event) => onChange(toNumber(event.target.value))}
          placeholder="—"
          className={control}
        />
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="+1"
          className="grid size-14 shrink-0 place-items-center rounded-control border border-white/10 bg-white/4 text-ink-200 transition-colors hover:bg-white/8 active:scale-[0.97]"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function SetLogger({
  mode,
  metrics,
  value,
  onChange,
  copy,
}: {
  mode: RunnerMode;
  metrics: MetricKind[];
  value: SetValue;
  onChange: (value: SetValue) => void;
  copy: RunnerDictionary["log"];
}) {
  // Weight is the one metric that counts toward volume, so it gets the first
  // slot and its own step; the rest keep the order the equipment defines.
  const extras = metrics.filter((metric) => metric !== "weight");
  const hasWeight = metrics.includes("weight");

  return (
    <div className="flex flex-col gap-4">
      {mode === "reps" ? (
        <Stepper
          label={copy.reps}
          value={value.reps}
          onChange={(reps) => onChange({ ...value, reps })}
        />
      ) : null}

      {hasWeight || extras.length > 0 ? (
        <div
          className={cn(
            "grid gap-3",
            hasWeight && extras.length === 0 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {hasWeight ? (
            <NumberInput
              label={copy.weight}
              value={value.weight}
              step={0.5}
              onChange={(weight) => onChange({ ...value, weight })}
            />
          ) : null}

          {extras.map((metric) => (
            <NumberInput
              key={metric}
              label={copy[metric]}
              value={value.metrics[metric] ?? null}
              step={0.5}
              onChange={(next) => {
                const updated = { ...value.metrics };
                if (next === null) delete updated[metric];
                else updated[metric] = next;
                onChange({ ...value, metrics: updated });
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
