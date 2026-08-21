import { notFound } from "next/navigation";

import { ExerciseForm } from "@/components/admin/exercises/exercise-form";
import { requireAdmin } from "@/lib/auth/session";
import { listTagOptions } from "@/lib/exercises/queries";
import { isLocale } from "@/lib/i18n/config";
import { getExercisesDictionary } from "@/lib/i18n/exercises-dictionary";

export default async function NewExercisePage({
  params,
}: PageProps<"/[lang]/admin/exercises/new">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireAdmin(lang);

  const [copy, options] = await Promise.all([
    getExercisesDictionary(lang),
    listTagOptions(),
  ]);

  return (
    <ExerciseForm
      lang={lang}
      exercise={null}
      video={null}
      options={options}
      copy={copy}
    />
  );
}
