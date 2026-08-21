import { notFound } from "next/navigation";
import { connection } from "next/server";

import { WorkoutList } from "@/components/admin/workouts/workout-list";
import { Eyebrow } from "@/components/ui/eyebrow";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listWorkouts } from "@/lib/workouts/queries";

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/workouts">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = await getDictionary(lang);
  return { title: dict.admin.nav.workouts };
}

export default async function WorkoutsPage({
  params,
}: PageProps<"/[lang]/admin/workouts">) {
  // Request-time, never prerendered: the [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // an admin page with no session and reach for the database to do it.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.admin.workouts;
  const workouts = await listWorkouts();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Eyebrow>{dict.admin.nav.badge}</Eyebrow>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{copy.page.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-400">
          {copy.page.subtitle}
        </p>
      </div>

      <WorkoutList
        workouts={workouts}
        lang={lang}
        copy={{ ...copy.list, difficulties: copy.difficulties }}
        errors={copy.errors}
      />
    </div>
  );
}
