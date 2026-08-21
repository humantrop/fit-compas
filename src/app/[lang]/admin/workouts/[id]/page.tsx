import { notFound } from "next/navigation";
import { connection } from "next/server";

import { WorkoutBuilder } from "@/components/admin/workouts/workout-builder";
import { translate } from "@/db/schema/i18n";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  getWorkoutDraft,
  listExerciseOptions,
  listWorkoutTagOptions,
} from "@/lib/workouts/queries";

/** Guards the query: Postgres errors out on a uuid cast, it does not return null. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/workouts/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !UUID.test(id)) return {};

  const workout = await getWorkoutDraft(id);
  if (!workout) return {};

  return { title: translate(workout.title, lang) };
}

export default async function WorkoutBuilderPage({
  params,
}: PageProps<"/[lang]/admin/workouts/[id]">) {
  await connection();

  const { lang, id } = await params;
  if (!isLocale(lang) || !UUID.test(id)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.admin.workouts;

  // The picker's options and the tag vocabularies are independent of the
  // workout, so all three go out at once rather than in sequence.
  const [workout, options, tags] = await Promise.all([
    getWorkoutDraft(id),
    listExerciseOptions(),
    listWorkoutTagOptions(),
  ]);

  if (!workout) notFound();

  return (
    <WorkoutBuilder
      workout={workout}
      options={options}
      tags={tags}
      lang={lang}
      copy={{
        ...copy.builder,
        kinds: copy.kinds,
        difficulties: copy.difficulties,
      }}
      errors={copy.errors}
      picker={copy.picker}
      preview={{ ...copy.preview, kinds: copy.kinds }}
      metricLabels={dict.admin.metrics}
    />
  );
}
