import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TaxonomyIcon } from "@/components/admin/taxonomy-icon";
import { Surface } from "@/components/ui/surface";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { TAXONOMIES } from "@/lib/taxonomy/config";
import { countTaxonomies } from "@/lib/taxonomy/queries";

export default async function ConfigurationPage({
  params,
}: PageProps<"/[lang]/admin/configuration">) {
  // Request-time, never prerendered: the parent [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // an admin page with no session and reach for the database to do it.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.admin.config;
  const counts = await countTaxonomies();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TAXONOMIES.map((def) => {
          const vocabulary = dict.admin.vocabularies[def.key];
          const count = counts[def.key];

          return (
            <Surface
              key={def.key}
              as={Link}
              href={`/${lang}/admin/configuration/${def.slug}`}
              className="group flex flex-col gap-4 p-6 transition-colors hover:border-white/16"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-control border border-brand-500/22 bg-brand-500/10 text-brand-200">
                  <TaxonomyIcon taxonomy={def.key} className="size-4.5" />
                </span>
                <ArrowRight className="size-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-200" />
              </div>

              <div>
                <h2 className="text-[15px] font-semibold text-ink-50">
                  {vocabulary.title}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
                  {vocabulary.description}
                </p>
              </div>

              <p className="mt-auto text-[12px] text-ink-500">
                <span className="font-mono text-ink-300">{count.active}</span>{" "}
                {copy.activeLabel}
                {count.total !== count.active ? (
                  <>
                    {" · "}
                    <span className="font-mono text-ink-400">
                      {count.total - count.active}
                    </span>{" "}
                    {copy.retiredLabel}
                  </>
                ) : null}
              </p>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}
