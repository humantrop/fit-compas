"use client";

import { Plus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import type { BodyMetric } from "@/db/schema/progress";
import { saveMeasurementAction } from "@/lib/progress/actions";
import { fill, type ProgressCopy } from "@/lib/progress/copy";
import {
  METRICS,
  METRIC_ORDER,
  displayRange,
  unitSymbol,
  type UnitSystem,
} from "@/lib/progress/metrics";
import { PROGRESS_IDLE } from "@/lib/progress/types";

/**
 * Record one measurement.
 *
 * A client component for one reason: the unit and the plausible range shown
 * under the field depend on which metric is picked, and both come out of
 * `lib/progress/metrics.ts` — the same module the server checks against. A
 * server-rendered form would either show no bounds at all or need a round trip
 * to change the word "kg" to "cm".
 *
 * The field is `type="text"` with a decimal keyboard rather than
 * `type="number"`. A Serbian or Russian phone keyboard offers a comma, and
 * `type="number"` silently discards what it cannot parse — the reader types
 * 82,4 and watches the field empty itself. `parseDecimal` on the server takes
 * either separator, so the honest input is the one that lets them type it.
 *
 * The date defaults to today and is capped there: a measurement is a record of
 * something that already happened, and the server refuses a future date
 * regardless of what this field allows.
 */
export function MeasurementForm({
  today,
  units,
  localeTag,
  defaultMetric,
  copy,
}: {
  today: string;
  units: UnitSystem;
  localeTag: string;
  defaultMetric: BodyMetric;
  copy: ProgressCopy;
}) {
  const [state, action, pending] = useActionState(
    saveMeasurementAction,
    PROGRESS_IDLE,
  );
  const [metric, setMetric] = useState<BodyMetric>(defaultMetric);
  const value = useRef<HTMLInputElement>(null);

  const def = METRICS[metric];
  const symbol = unitSymbol(def.quantity, units);
  const range = displayRange(metric, units);
  const numbers = new Intl.NumberFormat(localeTag, { maximumFractionDigits: 1 });

  // Clearing the number but keeping the metric and the date: the next
  // measurement is almost always the next body part on the same morning, and
  // resetting the whole form would make somebody re-pick the date eleven times.
  useEffect(() => {
    if (state.status === "saved" && value.current) value.current.value = "";
  }, [state]);

  return (
    <Surface tone="strong" edge className="p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.measure.formTitle}
      </h2>

      <form action={action} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.measure.metric}
            </span>
            <select
              name="metric"
              value={metric}
              onChange={(event) => setMetric(event.target.value as BodyMetric)}
              className={fieldControl}
            >
              {METRIC_ORDER.map((key) => (
                <option key={key} value={key} className="bg-base-900">
                  {copy.metrics[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.measure.day}
            </span>
            <input
              type="date"
              name="day"
              defaultValue={today}
              max={today}
              required
              className={fieldControl}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.measure.value}
            </span>
            <div className="relative">
              <input
                ref={value}
                type="text"
                name="value"
                inputMode="decimal"
                autoComplete="off"
                required
                aria-describedby="measure-range"
                className={`${fieldControl} pr-12`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 grid w-12 place-items-center text-[13px] text-ink-500">
                {symbol}
              </span>
            </div>
          </label>
        </div>

        <p id="measure-range" className="text-[12px] text-ink-500">
          {fill(copy.measure.rangeHint, {
            min: numbers.format(range.min),
            max: numbers.format(range.max),
            unit: symbol,
          })}
          {" · "}
          {copy.measure.replaceNote}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              copy.measure.saving
            ) : (
              <>
                <Plus className="size-4" />
                {copy.measure.submit}
              </>
            )}
          </Button>

          {state.status === "saved" ? (
            <p className="text-[13px] text-emerald-300">{copy.measure.saved}</p>
          ) : null}

          {state.status === "error" && state.code ? (
            <p role="alert" className="text-[13px] text-rose-300">
              {copy.errors[state.code]}
            </p>
          ) : null}
        </div>
      </form>
    </Surface>
  );
}
