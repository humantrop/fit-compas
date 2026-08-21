"use client";

import { Star } from "lucide-react";
import { useMemo, useState } from "react";

import { FieldLabel, Hint } from "@/components/admin/exercises/ui";
import { translate, type Translated } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ExercisesDictionary } from "@/lib/i18n/exercises-dictionary";
import { cn } from "@/lib/utils";

export type PickerOption = {
  id: string;
  slug: string;
  name: Translated;
  isActive: boolean;
  parentId: string | null;
};

/**
 * One vocabulary's worth of checkboxes.
 *
 * Retired items stay out of the way but are not hidden outright: an exercise
 * tagged before the item was switched off still has to render and still has to
 * be un-taggable. So a retired item shows when it is selected, and otherwise
 * only behind the toggle.
 */
export function TagPicker({
  name,
  label,
  hint,
  options,
  initial,
  locale,
  copy,
  primary,
}: {
  name: string;
  label: string;
  hint?: string;
  options: PickerOption[];
  initial: string[];
  locale: Locale;
  copy: ExercisesDictionary["form"];
  /** Muscle groups only: adds the primary-mover star to each selected row. */
  primary?: { name: string; initial: string[] };
}) {
  const [picked, setPicked] = useState(() => new Set(initial));
  const [primaryIds, setPrimaryIds] = useState(() => new Set(primary?.initial ?? []));
  const [showRetired, setShowRetired] = useState(false);

  const hasRetired = useMemo(
    () => options.some((option) => !option.isActive),
    [options],
  );

  const visible = options.filter(
    (option) => option.isActive || showRetired || picked.has(option.id),
  );

  function toggle(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

    // Un-ticking a muscle has to drop its star too, or the form submits a
    // primary id for a muscle that is no longer tagged.
    setPrimaryIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function togglePrimary(id: string) {
    setPrimaryIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-[12px] text-ink-500">
          {copy.selectedCount.replace("{count}", String(picked.size))}
        </span>
      </div>

      {options.length === 0 ? (
        <p className="rounded-control border border-dashed border-white/10 px-4 py-3 text-[13px] text-ink-500">
          {copy.noOptions}
        </p>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-control border border-white/10 bg-white/2 p-1.5">
          <ul className="flex flex-col">
            {visible.map((option) => {
              const checked = picked.has(option.id);
              const isPrimary = primaryIds.has(option.id);

              return (
                <li key={option.id} className="flex items-center gap-1">
                  <label
                    className={cn(
                      "flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-control px-2.5",
                      "text-[14px] transition-colors hover:bg-white/6",
                      option.parentId && "pl-8",
                      checked ? "text-ink-100" : "text-ink-400",
                    )}
                  >
                    <input
                      type="checkbox"
                      name={name}
                      value={option.id}
                      checked={checked}
                      onChange={() => toggle(option.id)}
                      className="size-4 shrink-0 accent-brand-500"
                    />
                    <span className="truncate">{translate(option.name, locale)}</span>
                    {!option.isActive ? (
                      <span className="shrink-0 text-[11px] text-ink-600">
                        {copy.retired}
                      </span>
                    ) : null}
                  </label>

                  {primary && checked ? (
                    <button
                      type="button"
                      onClick={() => togglePrimary(option.id)}
                      aria-pressed={isPrimary}
                      title={isPrimary ? copy.primary : copy.togglePrimary}
                      aria-label={isPrimary ? copy.primary : copy.togglePrimary}
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-control transition-colors",
                        isPrimary
                          ? "text-amber-300 hover:text-amber-200"
                          : "text-ink-600 hover:text-ink-300",
                      )}
                    >
                      <Star className={cn("size-4", isPrimary && "fill-current")} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {primary
        ? [...primaryIds].map((id) => (
            <input key={id} type="hidden" name={primary.name} value={id} />
          ))
        : null}

      <div className="flex items-baseline justify-between gap-3">
        {hint ? <Hint>{hint}</Hint> : <span />}
        {hasRetired ? (
          <button
            type="button"
            onClick={() => setShowRetired((value) => !value)}
            className="shrink-0 text-[12px] text-ink-500 underline-offset-2 transition-colors hover:text-ink-300 hover:underline"
          >
            {copy.showRetired}
          </button>
        ) : null}
      </div>
    </div>
  );
}
