"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { fieldControl } from "@/components/ui/field";
import { plural, type LibraryCopy } from "@/lib/library/copy";
import {
  SORTS,
  activeFilterCount,
  libraryQueryToString,
  selectedFor,
  withFacet,
  type LibraryQuery,
  type SortKey,
} from "@/lib/library/filters";
import type { Difficulty, Facet, FacetKey, FacetOption } from "@/lib/library/types";
import { cn } from "@/lib/utils";

/**
 * The only client component in the library.
 *
 * It owns no results — it rewrites the query string and lets the server
 * re-render the grid. That keeps a filtered view shareable as a link, keeps the
 * back button meaningful, and keeps the exercise rows out of the browser
 * bundle.
 */

const VISIBLE_OPTIONS = 8;

type Props = {
  /** e.g. `/sr/library/exercises` — the query string is appended to it. */
  basePath: string;
  query: LibraryQuery;
  facets: Facet[];
  copy: LibraryCopy;
  /** BCP 47 tag, for plural rules and number formatting. */
  localeTag: string;
};

export function FilterPanel({ basePath, query, facets, copy, localeTag }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(query);

  function navigate(next: LibraryQuery, mode: "push" | "replace" = "push") {
    const href = `${basePath}${libraryQueryToString(next)}`;
    startTransition(() => {
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  const usable = facets.filter((facet) => facet.options.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Search and sort stay visible at every width — they are the two
          controls people reach for first. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchBox
          value={query.q}
          placeholder={copy.filters.searchPlaceholder}
          label={copy.filters.searchLabel}
          onChange={(q) => navigate({ ...query, q, page: 1 }, "replace")}
        />

        <SortSelect
          value={query.sort}
          copy={copy}
          onChange={(sort) => navigate({ ...query, sort, page: 1 })}
        />

        {usable.length ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={cn(
              "inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-control",
              "border border-white/10 bg-white/4 px-4 text-[14px] font-semibold",
              "text-ink-200 transition-colors hover:border-white/16 hover:bg-white/6",
              "lg:hidden",
              open && "border-brand-500/50 text-brand-200",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {copy.filters.open}
            {active ? (
              <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                {active}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {usable.length ? (
        <div
          aria-busy={pending}
          className={cn(
            "flex-col gap-6 transition-opacity",
            open ? "flex" : "hidden lg:flex",
            pending && "opacity-60",
          )}
        >
          {usable.map((facet) => (
            <FacetGroup
              key={facet.key}
              facet={facet}
              copy={copy}
              localeTag={localeTag}
              selected={selectedFor(query, facet.key)}
              onToggle={(slug) => navigate(withFacet(query, facet.key, slug))}
            />
          ))}

          {active ? (
            <button
              type="button"
              onClick={() =>
                navigate({
                  ...query,
                  q: "",
                  equipment: [],
                  muscles: [],
                  goals: [],
                  activities: [],
                  difficulty: [],
                  page: 1,
                })
              }
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-ink-400 transition-colors hover:text-ink-100"
            >
              <X className="size-3.5" />
              {copy.filters.clear}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ search */

function SearchBox({
  value,
  label,
  placeholder,
  onChange,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);

  // Held in a ref so a parent re-render — every transition causes one — does
  // not restart the debounce timer below.
  const commit = useRef(onChange);
  useEffect(() => {
    commit.current = onChange;
  });

  // A navigation from elsewhere (a cleared filter, the back button) has to win
  // over whatever is in the box.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

  // Debounced: one navigation per pause, not one per keystroke.
  useEffect(() => {
    if (draft === committed.current) return;

    const timer = setTimeout(() => {
      committed.current = draft;
      commit.current(draft);
    }, 300);

    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={draft}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        className={cn(fieldControl, "pl-11")}
      />
    </div>
  );
}

function SortSelect({
  value,
  copy,
  onChange,
}: {
  value: SortKey;
  copy: LibraryCopy;
  onChange: (value: SortKey) => void;
}) {
  return (
    <select
      value={value}
      aria-label={copy.filters.sortLabel}
      onChange={(event) => onChange(event.target.value as SortKey)}
      className={cn(fieldControl, "sm:w-48")}
    >
      {SORTS.map((sort) => (
        <option key={sort} value={sort} className="bg-base-800">
          {copy.filters.sorts[sort]}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ facets */

type Row = { option: FacetOption; nested: boolean };

/**
 * Children are listed under their parent so "Lats" reads as part of "Back".
 * A child whose parent has no published exercises of its own still has to
 * appear, so it is promoted to the top level rather than dropped.
 */
function toRows(options: FacetOption[]): Row[] {
  const slugs = new Set(options.map((option) => option.slug));
  const rows: Row[] = [];

  for (const option of options) {
    if (option.parentSlug && slugs.has(option.parentSlug)) continue;
    rows.push({ option, nested: false });

    for (const child of options) {
      if (child.parentSlug === option.slug) rows.push({ option: child, nested: true });
    }
  }

  return rows;
}

function FacetGroup({
  facet,
  copy,
  localeTag,
  selected,
  onToggle,
}: {
  facet: Facet;
  copy: LibraryCopy;
  localeTag: string;
  selected: string[];
  onToggle: (slug: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => toRows(facet.options), [facet.options]);

  // A selected option must stay visible even when it sits past the fold.
  const alwaysVisible = expanded || rows.length <= VISIBLE_OPTIONS + 1;
  const shown = alwaysVisible
    ? rows
    : rows.filter(
        (row, index) => index < VISIBLE_OPTIONS || selected.includes(row.option.slug),
      );
  const hidden = rows.length - shown.length;

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {copy.filters.groups[facet.key]}
      </legend>

      <div className="flex flex-wrap gap-1.5">
        {shown.map(({ option, nested }) => (
          <Chip
            key={option.slug}
            label={optionLabel(facet.key, option, copy)}
            count={option.count}
            nested={nested}
            checked={selected.includes(option.slug)}
            onToggle={() => onToggle(option.slug)}
          />
        ))}
      </div>

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-[12px] font-semibold text-brand-300 transition-colors hover:text-brand-200"
        >
          {plural(copy.filters.showAll, hidden, localeTag)}
        </button>
      ) : null}

      {expanded && rows.length > VISIBLE_OPTIONS + 1 ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="self-start text-[12px] font-semibold text-ink-400 transition-colors hover:text-ink-200"
        >
          {copy.filters.showLess}
        </button>
      ) : null}
    </fieldset>
  );
}

/** Difficulty options carry an enum value, not a translated vocabulary name. */
function optionLabel(key: FacetKey, option: FacetOption, copy: LibraryCopy): string {
  if (key !== "difficulty") return option.label;
  return copy.difficulty[option.slug as Difficulty] ?? option.label;
}

function Chip({
  label,
  count,
  checked,
  nested,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  nested: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-2",
        "text-[13px] font-medium transition-colors",
        checked
          ? "border-brand-500/50 bg-brand-500/16 text-brand-100"
          : "border-white/10 bg-white/4 text-ink-300 hover:border-white/18 hover:text-ink-100",
        nested && "ml-3",
      )}
    >
      {nested ? <span aria-hidden className="text-ink-500">↳</span> : null}
      {label}
      <span
        className={cn(
          "font-mono text-[11px]",
          checked ? "text-brand-300" : "text-ink-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}
