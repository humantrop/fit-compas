"use client";

import { ChevronRight, Layers, ListChecks, Plus, Search, Timer, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import { createWorkoutAction } from "@/lib/workouts/actions";
import { formatDuration } from "@/lib/workouts/config";
import type { WorkoutSummary } from "@/lib/workouts/queries";
import { slugify } from "@/lib/taxonomy/slug";
import {
  WORKOUT_IDLE,
  type Difficulty,
  type WorkoutErrorCopy,
} from "@/lib/workouts/types";
import { cn } from "@/lib/utils";

export type WorkoutListCopy = {
  create: string;
  createTitle: string;
  titleLabel: string;
  titleHint: string;
  slug: string;
  slugHint: string;
  save: string;
  saving: string;
  cancel: string;
  search: string;
  filterAll: string;
  filterPublished: string;
  filterDrafts: string;
  empty: string;
  emptyHint: string;
  emptyFiltered: string;
  published: string;
  draft: string;
  blocks: string;
  exercises: string;
  open: string;
  difficulties: Record<Difficulty, string>;
};

type Filter = "all" | "published" | "drafts";

export function WorkoutList({
  workouts,
  lang,
  copy,
  errors,
}: {
  workouts: WorkoutSummary[];
  lang: Locale;
  copy: WorkoutListCopy;
  errors: WorkoutErrorCopy;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return workouts.filter((workout) => {
      if (filter === "published" && !workout.isPublished) return false;
      if (filter === "drafts" && workout.isPublished) return false;
      if (!term) return true;

      const haystack = [workout.slug, ...Object.values(workout.title)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [workouts, filter, term]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            aria-label={copy.search}
            className={cn(fieldControl, "h-11 pl-10 text-[14px]")}
          />
        </div>

        <div className="flex rounded-control border border-white/10 bg-white/4 p-1">
          {(
            [
              ["all", copy.filterAll],
              ["published", copy.filterPublished],
              ["drafts", copy.filterDrafts],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors",
                filter === value
                  ? "bg-brand-500/18 text-brand-100"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Button type="button" size="sm" onClick={() => setCreating((open) => !open)}>
          <Plus className="size-4" />
          {copy.create}
        </Button>
      </div>

      {creating ? (
        <CreateForm
          lang={lang}
          copy={copy}
          errors={errors}
          onDone={() => setCreating(false)}
        />
      ) : null}

      <Surface tone="bare" className="divide-y divide-white/6">
        {matches.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-[14px] font-medium text-ink-200">
              {workouts.length === 0 ? copy.empty : copy.emptyFiltered}
            </p>
            {workouts.length === 0 ? (
              <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">
                {copy.emptyHint}
              </p>
            ) : null}
          </div>
        ) : (
          matches.map((workout) => (
            <Link
              key={workout.id}
              href={`/${lang}/admin/workouts/${workout.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/6 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-ink-100">
                    {translate(workout.title, lang)}
                  </span>

                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
                      workout.isPublished
                        ? "border-success/25 bg-success/10 text-success"
                        : "border-white/10 text-ink-500",
                    )}
                  >
                    {workout.isPublished ? copy.published : copy.draft}
                  </span>

                  <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-medium text-ink-400">
                    {copy.difficulties[workout.difficulty]}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    <Timer className="size-3.5" />
                    {formatDuration(workout.estimatedDurationSec)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3.5" />
                    {workout.sectionCount} {copy.blocks}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="size-3.5" />
                    {workout.itemCount} {copy.exercises}
                  </span>
                </div>
              </div>

              <ChevronRight
                aria-label={copy.open}
                className="size-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))
        )}
      </Surface>
    </div>
  );
}

/**
 * Asks for a name and nothing else.
 *
 * Difficulty, tags and the blocks themselves are all easier to decide with the
 * session in front of you — a dialog that demands them up front just gets
 * filled with placeholders.
 */
function CreateForm({
  lang,
  copy,
  errors,
  onDone,
}: {
  lang: Locale;
  copy: WorkoutListCopy;
  errors: WorkoutErrorCopy;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(createWorkoutAction, WORKOUT_IDLE);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <Surface tone="strong" edge className="p-4 sm:p-5">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="lang" value={lang} />

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ink-50">{copy.createTitle}</h3>
          <button
            type="button"
            onClick={onDone}
            aria-label={copy.cancel}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="title"
            label={copy.titleLabel}
            hint={copy.titleHint}
            required
            maxLength={90}
            autoComplete="off"
            onChange={(event) => {
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
          />

          <Field
            name="slug"
            label={copy.slug}
            hint={copy.slugHint}
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            maxLength={60}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </div>

        {state.status === "error" && state.code ? (
          <p
            role="alert"
            className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
          >
            {errors[state.code]}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {copy.cancel}
          </Button>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    </Surface>
  );
}
