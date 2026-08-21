import { Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { ExerciseCard } from "@/components/admin/exercises/exercise-card";
import { ExerciseFilterBar } from "@/components/admin/exercises/exercise-filters";
import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { requireAdmin } from "@/lib/auth/session";
import { readFilters } from "@/lib/exercises/filters";
import { countExercises, listExercises, listTagOptions } from "@/lib/exercises/queries";
import { hasActiveFilters } from "@/lib/exercises/types";
import { isLocale } from "@/lib/i18n/config";
import { getExercisesDictionary } from "@/lib/i18n/exercises-dictionary";

/**
 * The exercise library, from the coach's side.
 *
 * `requireAdmin` runs here as well as in the admin layout. The layout is the
 * gate for the area; this is the gate for the page, and a page that can only
 * be reached through a layout is an assumption that stops holding the first
 * time the route tree is rearranged.
 */
export default async function AdminExercisesPage({
  params,
  searchParams,
}: PageProps<"/[lang]/admin/exercises">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireAdmin(lang);

  const copy = await getExercisesDictionary(lang);
  const filters = readFilters(await searchParams);

  const [page, options, counts] = await Promise.all([
    listExercises(filters),
    listTagOptions(),
    countExercises(),
  ]);

  const filtering = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{copy.list.title}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-400">
            {copy.list.subtitle}
          </p>
        </div>

        <ButtonLink href={`/${lang}/admin/exercises/new`} size="sm">
          <Plus className="size-4" />
          {copy.list.new}
        </ButtonLink>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Count label={copy.counts.total} value={counts.total} />
        <Count label={copy.counts.published} value={counts.published} />
        <Count label={copy.counts.missingVideo} value={counts.missingVideo} />
      </div>

      <ExerciseFilterBar
        filters={filters}
        options={{
          equipment: options.equipment,
          muscles: options.muscles,
          activities: options.activities,
        }}
        locale={lang}
        copy={copy}
      />

      {page.items.length === 0 ? (
        <Surface tone="bare" className="flex flex-col items-start gap-4 p-8">
          <p className="max-w-lg text-[14px] leading-relaxed text-ink-400">
            {filtering ? copy.list.emptyFiltered : copy.list.empty}
          </p>
          {filtering ? null : (
            <ButtonLink href={`/${lang}/admin/exercises/new`} size="sm">
              <Plus className="size-4" />
              {copy.list.emptyCta}
            </ButtonLink>
          )}
        </Surface>
      ) : (
        <div className="flex flex-col gap-3">
          {page.items.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              lang={lang}
              copy={copy}
            />
          ))}

          {/* Never let a cap read as "that is all there is". */}
          {page.total > page.items.length ? (
            <p className="px-1 text-[12px] text-ink-500">
              {copy.list.showing
                .replace("{shown}", String(page.items.length))
                .replace("{total}", String(page.total))}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <Surface className="flex flex-col gap-1 p-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </span>
      <span className="text-2xl font-bold text-ink-50">{value}</span>
    </Surface>
  );
}
