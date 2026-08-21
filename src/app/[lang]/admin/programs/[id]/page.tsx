import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ProgramEditor,
  type WorkoutChoice,
} from "@/components/admin/program-editor";
import { translate } from "@/db/schema/i18n";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { getProgram } from "@/lib/programs/queries";
import { listWorkouts, sortWorkouts } from "@/lib/programs/workout-source";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/programs/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !UUID.test(id)) return {};

  const program = await getProgram(id);
  if (!program) return {};

  return { title: translate(program.title, lang) };
}

export default async function ProgramPage({
  params,
}: PageProps<"/[lang]/admin/programs/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  // Postgres rejects a malformed uuid with an error rather than no rows, so
  // the shape is checked before the query rather than after it.
  if (!UUID.test(id)) notFound();

  const [dict, program, source] = await Promise.all([
    getDictionary(lang),
    getProgram(id),
    listWorkouts(),
  ]);

  if (!program) notFound();

  const copy = dict.admin.programs;

  // Translating here keeps the editor a plain client component: it receives
  // strings, not jsonb, and never needs the locale-fallback helper.
  const workouts: WorkoutChoice[] = sortWorkouts(source.workouts, lang).map(
    (workout) => ({
      id: workout.id,
      label: translate(workout.title, lang) || workout.id.slice(0, 8),
      isPublished: workout.isPublished,
    }),
  );

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href={`/${lang}/admin/programs`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="size-4" />
          {copy.title}
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {translate(program.title, lang)}
            </h1>
            <p className="mt-1.5 font-mono text-[12px] text-ink-500">{program.slug}</p>
          </div>

          <span
            className={
              program.isPublished
                ? "rounded-full border border-brand-500/30 bg-brand-500/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-200"
                : "rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500"
            }
          >
            {program.isPublished ? copy.published : copy.draft}
          </span>
        </div>

        {translate(program.description, lang) ? (
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-400">
            {translate(program.description, lang)}
          </p>
        ) : null}
      </div>

      <ProgramEditor
        program={program}
        workouts={workouts}
        workoutsAvailable={source.available}
        lang={lang}
        copy={copy}
        errors={copy.errors}
      />
    </div>
  );
}
