"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { control, selectControl } from "@/components/admin/exercises/ui";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { TagOption } from "@/lib/exercises/queries";
import {
  DIFFICULTIES,
  FILTER_PARAMS,
  hasActiveFilters,
  type ExerciseFilters,
} from "@/lib/exercises/types";
import type { Locale } from "@/lib/i18n/config";
import type { ExercisesDictionary } from "@/lib/i18n/exercises-dictionary";
import { cn } from "@/lib/utils";

/**
 * Filters live in the query string, not in component state.
 *
 * That makes a filtered view linkable and survivable across a reload, and it
 * is what lets the list stay a Server Component — the page reads the same
 * params this bar writes.
 */
export function ExerciseFilterBar({
  filters,
  options,
  locale,
  copy,
}: {
  filters: ExerciseFilters;
  options: {
    equipment: TagOption[];
    muscles: TagOption[];
    activities: TagOption[];
  };
  locale: Locale;
  copy: ExercisesDictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(filters.q);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    const search = next.toString();
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

  // Typing should not push a history entry per keystroke, and it should not
  // fire a query per keystroke either.
  useEffect(() => {
    if (query === filters.q) return;

    const timer = setTimeout(() => apply({ [FILTER_PARAMS.q]: query || null }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const active = hasActiveFilters(filters);

  return (
    <Surface tone="bare" className={cn("flex flex-col gap-4 p-4", pending && "opacity-70")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{copy.filters.search}</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.list.searchPlaceholder}
            className={cn(control, "pl-11")}
          />
        </label>

        <div className="flex gap-1 rounded-control border border-white/10 bg-white/4 p-1">
          {(
            [
              ["all", copy.filters.statusAll],
              ["published", copy.filters.statusPublished],
              ["draft", copy.filters.statusDraft],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                apply({ [FILTER_PARAMS.status]: value === "all" ? null : value })
              }
              aria-pressed={filters.status === value}
              className={cn(
                "h-10 rounded-[10px] px-3.5 text-[13px] font-medium transition-colors",
                filters.status === value
                  ? "bg-brand-500/15 text-brand-100"
                  : "text-ink-400 hover:text-ink-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label={copy.filters.muscle}
          value={filters.muscleGroupId}
          placeholder={copy.filters.muscleAll}
          onChange={(value) => apply({ [FILTER_PARAMS.muscleGroupId]: value })}
          options={options.muscles.map((option) => ({
            value: option.id,
            // A child group reads as "— Lats" so the tree survives a flat select.
            label: `${option.parentId ? "— " : ""}${translate(option.name, locale)}`,
          }))}
        />
        <Select
          label={copy.filters.equipment}
          value={filters.equipmentId}
          placeholder={copy.filters.equipmentAll}
          onChange={(value) => apply({ [FILTER_PARAMS.equipmentId]: value })}
          options={options.equipment.map((option) => ({
            value: option.id,
            label: translate(option.name, locale),
          }))}
        />
        <Select
          label={copy.filters.activity}
          value={filters.activityId}
          placeholder={copy.filters.activityAll}
          onChange={(value) => apply({ [FILTER_PARAMS.activityId]: value })}
          options={options.activities.map((option) => ({
            value: option.id,
            label: translate(option.name, locale),
          }))}
        />
        <Select
          label={copy.filters.difficulty}
          value={filters.difficulty}
          placeholder={copy.filters.difficultyAll}
          onChange={(value) => apply({ [FILTER_PARAMS.difficulty]: value })}
          options={DIFFICULTIES.map((level) => ({
            value: level,
            label: copy.difficulty[level],
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["all", copy.filters.videoAll],
            ["with", copy.filters.videoWith],
            ["without", copy.filters.videoWithout],
            ["problem", copy.filters.videoProblem],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              apply({ [FILTER_PARAMS.video]: value === "all" ? null : value })
            }
            aria-pressed={filters.video === value}
            className={cn(
              "h-9 rounded-full border px-3.5 text-[12px] font-medium transition-colors",
              filters.video === value
                ? "border-brand-500/30 bg-brand-500/12 text-brand-200"
                : "border-white/8 text-ink-400 hover:border-white/16 hover:text-ink-200",
            )}
          >
            {label}
          </button>
        ))}

        {active ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              apply(Object.fromEntries(Object.values(FILTER_PARAMS).map((k) => [k, null])));
            }}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-ink-400 transition-colors hover:text-ink-100"
          >
            <X className="size-3.5" />
            {copy.list.clear}
          </button>
        ) : null}
      </div>
    </Surface>
  );
}

function Select({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <label className="relative flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-500">
        {label}
      </span>
      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value || null)}
          className={selectControl}
        >
          <option value="" className="bg-base-900">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-base-900">
              {option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-500"
        >
          <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[1.5]">
            <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}
