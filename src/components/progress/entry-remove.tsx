"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import type { BodyMetric } from "@/db/schema/progress";
import { deleteMeasurementAction } from "@/lib/progress/actions";
import type { ProgressCopy } from "@/lib/progress/copy";
import { PROGRESS_IDLE } from "@/lib/progress/types";

/**
 * Delete one measurement.
 *
 * The smallest possible client island: the history table itself stays on the
 * server, and only the button that submits carries state. Each row has its own
 * `useActionState`, so a failure on one row reports on that row instead of at
 * the bottom of the table where nobody would know which delete it belonged to.
 *
 * No confirmation dialog. A measurement is one number that can be typed back in
 * ten seconds — a modal here would cost every correct deletion a tap to save
 * the rare wrong one.
 */
export function EntryRemove({
  metric,
  day,
  copy,
}: {
  metric: BodyMetric;
  day: string;
  copy: ProgressCopy;
}) {
  const [state, action, pending] = useActionState(
    deleteMeasurementAction,
    PROGRESS_IDLE,
  );

  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="metric" value={metric} />
      <input type="hidden" name="day" value={day} />

      {state.status === "error" && state.code ? (
        <span role="alert" className="text-[12px] text-rose-300">
          {copy.errors[state.code]}
        </span>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        aria-label={copy.measure.remove}
        className="rounded-control p-2 text-ink-500 transition-colors hover:bg-white/6 hover:text-rose-300 disabled:opacity-45"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
