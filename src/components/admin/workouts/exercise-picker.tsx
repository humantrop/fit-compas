"use client";

import { Dumbbell, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { fieldControl } from "@/components/ui/field";
import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { ExerciseOption } from "@/lib/workouts/queries";
import { cn } from "@/lib/utils";

export type ExercisePickerCopy = {
  title: string;
  search: string;
  close: string;
  empty: string;
  emptyHint: string;
  noMatch: string;
  draft: string;
  unilateral: string;
  noEquipment: string;
};

/**
 * Picks the movement for one line.
 *
 * A dialog rather than a `<select>`: the library grows into the hundreds, the
 * useful search is over the name in three languages plus the slug, and the
 * second line — which equipment, and whether it is unilateral — is what makes
 * the choice, none of which fits in an option element.
 */
export function ExercisePicker({
  options,
  lang,
  copy,
  onPick,
  onClose,
}: {
  options: ExerciseOption[];
  lang: Locale;
  copy: ExercisePickerCopy;
  onPick: (exercise: ExerciseOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!term) return options;
    return options.filter((option) => {
      const haystack = [option.slug, ...Object.values(option.title)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [options, term]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-void/70 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal
        aria-label={copy.title}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-white/10 bg-base-950/95 backdrop-blur-2xl pb-safe"
      >
        <div className="flex items-center gap-2 border-b border-white/8 p-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.search}
              aria-label={copy.search}
              className={cn(fieldControl, "h-11 pl-10 text-[14px]")}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-control border border-white/8 bg-white/4 text-ink-500">
                <Dumbbell className="size-5" />
              </span>
              <p className="mt-4 text-[14px] font-medium text-ink-200">{copy.empty}</p>
              <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-500">
                {copy.emptyHint}
              </p>
            </div>
          ) : matches.length === 0 ? (
            <p className="px-5 py-12 text-center text-[14px] text-ink-400">
              {copy.noMatch}
            </p>
          ) : (
            <ul className="divide-y divide-white/6">
              {matches.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => onPick(option)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/6 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[14px] font-medium text-ink-100">
                          {translate(option.title, lang)}
                        </span>
                        {!option.isPublished ? (
                          <span className="rounded-full border border-warn/25 bg-warn/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-warn">
                            {copy.draft}
                          </span>
                        ) : null}
                        {option.isUnilateral ? (
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium text-ink-400">
                            {copy.unilateral}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-[12px] text-ink-500">
                        {option.equipmentNames.length
                          ? option.equipmentNames
                              .map((name) => translate(name, lang))
                              .join(" · ")
                          : copy.noEquipment}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
