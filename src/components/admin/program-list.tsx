"use client";

import { CalendarRange, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { DIFFICULTIES, PROGRAM_LIMITS } from "@/lib/programs/config";
import { createProgramAction } from "@/lib/programs/actions";
import type { ProgramSummary } from "@/lib/programs/queries";
import { PROGRAM_IDLE, type ProgramErrorCopy } from "@/lib/programs/types";
import { slugify } from "@/lib/taxonomy/slug";
import { cn } from "@/lib/utils";

export type ProgramCopy = {
  title: string;
  subtitle: string;
  add: string;
  addTitle: string;
  search: string;
  filterAll: string;
  filterPublished: string;
  filterDraft: string;
  empty: string;
  emptyFiltered: string;
  titleLabel: string;
  titleHint: string;
  descriptionLabel: string;
  slug: string;
  slugHint: string;
  slugLocked: string;
  difficulty: string;
  difficulties: Record<string, string>;
  weeks: string;
  weeksHint: string;
  daysPerWeek: string;
  daysPerWeekHint: string;
  daysPerWeekWarning: string;
  save: string;
  saving: string;
  cancel: string;
  published: string;
  draft: string;
  weekCount: string;
  filledDays: string;
  restDays: string;
};

type Filter = "all" | "published" | "draft";

export function ProgramList({
  programs,
  lang,
  copy,
  errors,
}: {
  programs: ProgramSummary[];
  lang: Locale;
  copy: ProgramCopy;
  errors: ProgramErrorCopy;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);

  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return programs.filter((program) => {
      if (filter === "published" && !program.isPublished) return false;
      if (filter === "draft" && program.isPublished) return false;
      if (!term) return true;

      const haystack = [program.slug, ...Object.values(program.title)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [programs, filter, term]);

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
              ["draft", copy.filterDraft],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "rounded-[calc(var(--radius-control)-0.25rem)] px-3 py-2 text-[13px] font-medium transition-colors",
                filter === value
                  ? "bg-brand-500/16 text-brand-100"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {creating ? null : (
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {copy.add}
          </Button>
        )}
      </div>

      {creating ? (
        <CreateForm
          lang={lang}
          copy={copy}
          errors={errors}
          onDone={() => setCreating(false)}
        />
      ) : null}

      {matches.length === 0 ? (
        <Surface tone="bare" className="p-8 text-center">
          <p className="text-[14px] text-ink-400">
            {programs.length === 0 ? copy.empty : copy.emptyFiltered}
          </p>
        </Surface>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {matches.map((program) => (
            <li key={program.id}>
              <Surface
                as={Link}
                href={`/${lang}/admin/programs/${program.id}`}
                className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-white/16"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-brand-500/22 bg-brand-500/10 text-brand-200">
                    <CalendarRange className="size-5" />
                  </span>

                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
                      program.isPublished
                        ? "border-brand-500/30 bg-brand-500/12 text-brand-200"
                        : "border-white/10 text-ink-500",
                    )}
                  >
                    {program.isPublished ? copy.published : copy.draft}
                  </span>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold text-ink-50">
                    {translate(program.title, lang)}
                  </h2>
                  <p className="mt-1 truncate font-mono text-[12px] text-ink-500">
                    {program.slug}
                  </p>
                </div>

                <dl className="mt-auto flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-ink-400">
                  <div className="flex gap-1.5">
                    <dt>{copy.weekCount}</dt>
                    <dd className="font-mono text-ink-200">{program.weekCount}</dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{copy.filledDays}</dt>
                    <dd className="font-mono text-ink-200">
                      {program.filledDays}/{program.weekCount * program.daysPerWeek}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>{copy.restDays}</dt>
                    <dd className="font-mono text-ink-200">{program.restDays}</dd>
                  </div>
                </dl>
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Creating a program also lays out its grid — weeks and their day slots — so
 * the first thing the editor shows is a schedule to fill in rather than an
 * empty screen with one more "add" button on it.
 */
function CreateForm({
  lang,
  copy,
  errors,
  onDone,
}: {
  lang: Locale;
  copy: ProgramCopy;
  errors: ProgramErrorCopy;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createProgramAction, PROGRAM_IDLE);

  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (state.status === "saved" && state.id) {
      router.push(`/${lang}/admin/programs/${state.id}`);
    }
  }, [state, router, lang]);

  return (
    <Surface tone="strong" edge className="p-4 sm:p-5">
      <form action={action} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ink-50">{copy.addTitle}</h3>
          <button
            type="button"
            onClick={onDone}
            aria-label={copy.cancel}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`title_${locale}`}
              label={`${copy.titleLabel} · ${localeNames[locale]}`}
              required={locale === "sr"}
              maxLength={PROGRAM_LIMITS.titleMax}
              autoComplete="off"
              hint={locale === "sr" ? copy.titleHint : undefined}
              onChange={
                locale === "sr" && !slugTouched
                  ? (event) => setSlug(slugify(event.target.value))
                  : undefined
              }
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.difficulty}
            </span>
            <select
              name="difficulty"
              defaultValue="intermediate"
              className={cn(fieldControl, "appearance-none")}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {copy.difficulties[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="weeks"
            type="number"
            label={copy.weeks}
            hint={copy.weeksHint}
            defaultValue={4}
            min={PROGRAM_LIMITS.minWeeks}
            max={PROGRAM_LIMITS.maxWeeks}
          />
          <Field
            name="daysPerWeek"
            type="number"
            label={copy.daysPerWeek}
            hint={copy.daysPerWeekHint}
            defaultValue={7}
            min={PROGRAM_LIMITS.minDaysPerWeek}
            max={PROGRAM_LIMITS.maxDaysPerWeek}
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
