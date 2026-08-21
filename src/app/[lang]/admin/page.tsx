import { ArrowRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { TaxonomyIcon } from "@/components/admin/taxonomy-icon";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Surface } from "@/components/ui/surface";
import { getProfile } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { TAXONOMIES } from "@/lib/taxonomy/config";
import { countTaxonomies } from "@/lib/taxonomy/queries";

export default async function AdminHomePage({ params }: PageProps<"/[lang]/admin">) {
  // Request-time, never prerendered: the parent [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // an admin page with no session and reach for the database to do it.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.admin.home;

  const [profile, counts] = await Promise.all([getProfile(), countTaxonomies()]);
  const name = profile?.full_name?.split(" ")[0] ?? "";

  const total = Object.values(counts).reduce((sum, row) => sum + row.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Eyebrow>{dict.admin.nav.badge}</Eyebrow>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
          {copy.title}
          {name ? `, ${name}` : ""}.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
        <Surface
          as={Link}
          href={`/${lang}/admin/configuration`}
          tone="strong"
          edge
          className="group flex flex-col justify-between gap-6 p-7 transition-colors hover:border-white/16"
        >
          <div>
            <span className="inline-flex size-11 items-center justify-center rounded-control border border-brand-500/25 bg-brand-500/12 text-brand-200">
              <SlidersHorizontal className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink-50">
              {copy.configTitle}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
              {copy.configBody}
            </p>
          </div>

          <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-300">
            {copy.configCta}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Surface>

        <Surface className="flex flex-col gap-5 p-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {copy.vocabularies}
            </p>
            <p className="mt-1 text-3xl font-bold text-ink-50">{total}</p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {TAXONOMIES.map((def) => (
              <li
                key={def.key}
                className="flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="flex min-w-0 items-center gap-2 text-ink-300">
                  <TaxonomyIcon taxonomy={def.key} className="size-4 text-ink-500" />
                  <span className="truncate">
                    {dict.admin.vocabularies[def.key].title}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-ink-400">
                  {counts[def.key].active}/{counts[def.key].total}
                </span>
              </li>
            ))}
          </ul>
        </Surface>
      </div>

      <Surface tone="bare" className="flex items-start gap-3 p-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-100">{copy.soonTitle}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">
            {copy.soonBody}
          </p>
        </div>
      </Surface>
    </div>
  );
}
