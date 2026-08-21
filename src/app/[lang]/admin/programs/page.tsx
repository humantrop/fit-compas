import { notFound } from "next/navigation";

import { ProgramList } from "@/components/admin/program-list";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { listPrograms } from "@/lib/programs/queries";

/* No generateStaticParams: the admin layout reads the session cookie to check
   the role, so every page under it renders per request anyway. */

export async function generateMetadata({ params }: PageProps<"/[lang]/admin/programs">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = await getDictionary(lang);
  return { title: dict.admin.programs.title };
}

export default async function ProgramsPage({
  params,
}: PageProps<"/[lang]/admin/programs">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.admin.programs;
  const programs = await listPrograms();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      <ProgramList
        programs={programs}
        lang={lang}
        copy={copy}
        errors={dict.admin.programs.errors}
      />
    </div>
  );
}
