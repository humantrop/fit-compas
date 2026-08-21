import { ArrowLeft, Lightbulb, Play, Repeat2, Timer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DifficultyMeter } from "@/components/library/difficulty-meter";
import { formatDuration } from "@/components/library/library-card";
import { Surface } from "@/components/ui/surface";
import { isLocale } from "@/lib/i18n/config";
import { getLibraryCopy } from "@/lib/library/copy";
import { librarySource } from "@/lib/library/sources";
import { isLibraryKind, type LibraryTag } from "@/lib/library/types";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/library/[kind]/[slug]">): Promise<Metadata> {
  const { lang, kind, slug } = await params;
  if (!isLocale(lang) || !isLibraryKind(kind)) return {};

  const item = await librarySource(kind).get(slug, lang);
  if (!item) return {};

  return {
    title: item.title,
    description: item.summary || undefined,
    robots: { index: false, follow: false },
  };
}

export default async function LibraryDetailPage({
  params,
}: PageProps<"/[lang]/library/[kind]/[slug]">) {
  const { lang, kind, slug } = await params;
  if (!isLocale(lang) || !isLibraryKind(kind)) notFound();

  const copy = getLibraryCopy(lang);
  const item = await librarySource(kind).get(slug, lang);

  // Unknown slug and unpublished draft are the same answer on purpose: a
  // client must not be able to probe for content that is not out yet.
  if (!item) notFound();

  return (
    <article className="flex flex-col gap-8">
      <Link
        href={`/${lang}/library/${kind}`}
        className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="size-4" />
        {copy.detail.back}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          {/* Feature 06 owns video playback and the signed URLs behind it. This
              slot states what exists so the screen is honest until then. */}
          <Surface
            tone="strong"
            edge
            className="grid aspect-video place-items-center bg-linear-to-br from-brand-500/14 via-transparent to-glow/10"
          >
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <span className="grid size-14 place-items-center rounded-full border border-brand-400/35 bg-brand-500/16 text-brand-100">
                <Play className="size-5 translate-x-px fill-current" />
              </span>
              <p className="text-[13px] text-ink-400">
                {item.hasVideo && item.durationSec
                  ? formatDuration(item.durationSec)
                  : copy.detail.videoPending}
              </p>
            </div>
          </Surface>

          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">{item.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <DifficultyMeter
                level={item.difficulty}
                label={copy.difficulty[item.difficulty]}
              />

              <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-400">
                {item.mode === "time" ? (
                  <Timer className="size-3.5" />
                ) : (
                  <Repeat2 className="size-3.5" />
                )}
                {item.mode === "time" ? copy.card.time : copy.card.reps}
              </span>

              {item.isUnilateral ? (
                <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] font-semibold text-ink-300">
                  {copy.card.unilateral}
                </span>
              ) : null}
            </div>
          </div>

          {item.description ? (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {copy.detail.about}
              </h2>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink-200">
                {item.description}
              </p>
            </section>
          ) : null}

          {item.cues ? (
            <Surface className="flex items-start gap-3 border-brand-500/20 bg-brand-500/6 p-5">
              <Lightbulb className="mt-0.5 size-4.5 shrink-0 text-brand-300" />
              <div>
                <h2 className="text-[13px] font-semibold text-ink-100">
                  {copy.detail.cues}
                </h2>
                <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-ink-300">
                  {item.cues}
                </p>
              </div>
            </Surface>
          ) : null}
        </div>

        <Surface className="flex flex-col gap-6 p-6">
          <TagSection
            title={copy.detail.equipment}
            tags={item.equipment}
            href={(tag) => `/${lang}/library/${kind}?equipment=${tag.slug}`}
          />
          <TagSection
            title={copy.detail.muscles}
            tags={item.muscles}
            href={(tag) => `/${lang}/library/${kind}?muscles=${tag.slug}`}
          />
          <TagSection
            title={copy.detail.goals}
            tags={item.goals}
            href={(tag) => `/${lang}/library/${kind}?goals=${tag.slug}`}
          />
          <TagSection
            title={copy.detail.activities}
            tags={item.activities}
            href={(tag) => `/${lang}/library/${kind}?activities=${tag.slug}`}
          />
        </Surface>
      </div>
    </article>
  );
}

/**
 * Each tag links back into the filtered list. "More like this" costs nothing
 * when the filters already live in the URL.
 */
function TagSection({
  title,
  tags,
  href,
}: {
  title: string;
  tags: LibraryTag[];
  href: (tag: LibraryTag) => string;
}) {
  if (!tags.length) return null;

  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
        {title}
      </h2>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            href={href(tag)}
            className="rounded-full border border-white/10 bg-white/4 px-3 py-1.5 text-[12px] text-ink-300 transition-colors hover:border-brand-500/40 hover:text-brand-100"
          >
            {tag.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
