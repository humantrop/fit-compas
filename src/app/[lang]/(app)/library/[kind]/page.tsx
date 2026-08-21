import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FilterPanel } from "@/components/library/filter-panel";
import { KindTabs } from "@/components/library/kind-tabs";
import { LibraryCard } from "@/components/library/library-card";
import { EmptyNotice, PendingNotice } from "@/components/library/notice";
import { Pager } from "@/components/library/pager";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getLibraryCopy, plural } from "@/lib/library/copy";
import { isFiltered, parseLibraryQuery } from "@/lib/library/filters";
import { librarySource, libraryShelves } from "@/lib/library/sources";
import { isLibraryKind } from "@/lib/library/types";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/library/[kind]">): Promise<Metadata> {
  const { lang, kind } = await params;
  if (!isLocale(lang) || !isLibraryKind(kind)) return {};

  const copy = getLibraryCopy(lang);

  return {
    title: `${copy.kinds[kind].label} · ${copy.metaTitle}`,
    description: copy.metaDescription,
    // A filtered library is a private, transient view — there is nothing here
    // for a crawler, and every screen behind it needs a session anyway.
    robots: { index: false, follow: false },
  };
}

export default async function LibraryKindPage({
  params,
  searchParams,
}: PageProps<"/[lang]/library/[kind]">) {
  const { lang, kind } = await params;
  if (!isLocale(lang) || !isLibraryKind(kind)) notFound();

  const copy = getLibraryCopy(lang);
  const localeTag = localeTags[lang];
  const source = librarySource(kind);
  const basePath = `/${lang}/library/${kind}`;
  const tabs = libraryShelves().map(({ kind: k, status }) => ({ kind: k, status }));

  const header = (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      <KindTabs tabs={tabs} current={kind} lang={lang} copy={copy} />
    </div>
  );

  // Workouts (feature 07) and programs (feature 08) have no tables yet. Saying
  // so beats an empty grid, which reads as "you have nothing".
  if (source.status === "pending") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <PendingNotice title={copy.pending.title} body={copy.pending.body} />
      </div>
    );
  }

  const query = parseLibraryQuery(await searchParams);
  const [result, facets] = await Promise.all([
    source.search(query, lang),
    source.facets(lang),
  ]);

  return (
    <div className="flex flex-col gap-8">
      {header}

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-8">
          <FilterPanel
            basePath={basePath}
            query={query}
            facets={facets}
            copy={copy}
            localeTag={localeTag}
          />
        </aside>

        <section className="flex flex-col gap-5">
          <p className="text-[13px] text-ink-500">
            {plural(copy.counts[kind], result.total, localeTag)}
          </p>

          {result.items.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((item) => (
                  <LibraryCard
                    key={item.id}
                    item={item}
                    href={`${basePath}/${item.slug}`}
                    copy={copy}
                    localeTag={localeTag}
                  />
                ))}
              </div>

              <Pager
                basePath={basePath}
                query={query}
                total={result.total}
                pageSize={result.pageSize}
                copy={copy}
                localeTag={localeTag}
              />
            </>
          ) : (
            <EmptyNotice
              title={
                isFiltered(query) ? copy.empty.filteredTitle : copy.empty.emptyTitle
              }
              body={
                isFiltered(query) ? copy.empty.filteredBody : copy.empty.emptyBody
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
