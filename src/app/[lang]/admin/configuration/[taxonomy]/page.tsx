import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TaxonomyEditor } from "@/components/admin/taxonomy-editor";
import { TaxonomyIcon } from "@/components/admin/taxonomy-icon";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { taxonomyBySlug } from "@/lib/taxonomy/config";
import { listTaxonomy } from "@/lib/taxonomy/queries";

/* No generateStaticParams here: the layout reads the session cookie to check
   the admin role, so every one of these pages renders per request anyway. */

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/configuration/[taxonomy]">) {
  const { lang, taxonomy } = await params;
  if (!isLocale(lang)) return {};

  const def = taxonomyBySlug(taxonomy);
  if (!def) return {};

  const dict = await getDictionary(lang);
  return { title: dict.admin.vocabularies[def.key].title };
}

export default async function TaxonomyPage({
  params,
}: PageProps<"/[lang]/admin/configuration/[taxonomy]">) {
  // Request-time, never prerendered: the parent [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // an admin page with no session and reach for the database to do it.
  await connection();

  const { lang, taxonomy } = await params;
  if (!isLocale(lang)) notFound();

  const def = taxonomyBySlug(taxonomy);
  if (!def) notFound();

  const dict = await getDictionary(lang);
  const vocabulary = dict.admin.vocabularies[def.key];
  const items = await listTaxonomy(def.key);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Link
          href={`/${lang}/admin/configuration`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="size-4" />
          {dict.admin.config.title}
        </Link>

        <div className="mt-4 flex items-start gap-3.5">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-brand-500/22 bg-brand-500/10 text-brand-200">
            <TaxonomyIcon taxonomy={def.key} className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold sm:text-3xl">{vocabulary.title}</h1>
            <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-400">
              {vocabulary.description}
            </p>
          </div>
        </div>
      </div>

      <TaxonomyEditor
        taxonomy={def}
        items={items}
        lang={lang}
        copy={dict.admin.editor}
        errors={dict.admin.errors}
        metricLabels={dict.admin.metrics}
      />
    </div>
  );
}
