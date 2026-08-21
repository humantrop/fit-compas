import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Layers,
  Smartphone,
  Timer,
  TrendingUp,
  Video,
} from "lucide-react";
import { notFound } from "next/navigation";

import { HeroPreview } from "@/components/marketing/hero-preview";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Surface } from "@/components/ui/surface";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";

const featureIcons = [Video, Layers, CalendarDays, Timer, TrendingUp, Smartphone];

/* Bento rhythm: the first and fourth cards run wide on desktop so the grid
   reads as composed rather than as six identical boxes in a row. */
const featureSpans = [
  "md:col-span-2",
  "md:col-span-1",
  "md:col-span-1",
  "md:col-span-2",
  "md:col-span-1",
  "md:col-span-1",
];

const statValues = ["3 500+", "1 000+", "200+", "< 24h"];

export default async function LandingPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const statKeys = ["exercises", "workouts", "programs", "support"] as const;

  return (
    <>
      <SiteHeader lang={lang} nav={dict.nav} />

      <main className="flex-1">
        {/* ================= Hero ================= */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-20 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="animate-rise">
              <Eyebrow>{dict.hero.eyebrow}</Eyebrow>

              <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-bold sm:text-6xl">
                {dict.hero.title}
                <br />
                <span className="bg-linear-to-r from-brand-300 via-brand-400 to-glow bg-clip-text text-transparent">
                  {dict.hero.titleAccent}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-ink-300 sm:text-[17px]">
                {dict.hero.subtitle}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <ButtonLink href={`/${lang}/signup`} size="lg">
                  {dict.hero.ctaPrimary}
                  <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href={`/${lang}#how`} size="lg" variant="secondary">
                  {dict.hero.ctaSecondary}
                </ButtonLink>
              </div>

              <p className="mt-5 text-[13px] text-ink-500">{dict.hero.note}</p>
            </div>

            <div className="animate-rise lg:pl-4">
              <HeroPreview copy={dict.hero} />
            </div>
          </div>

          {/* Stat strip */}
          <Surface className="mt-16 grid grid-cols-2 divide-white/6 md:grid-cols-4 md:divide-x">
            {statKeys.map((key, index) => (
              <div
                key={key}
                className={cn(
                  "px-5 py-6 text-center",
                  index < 2 && "border-b border-white/6 md:border-b-0",
                  index % 2 === 1 && "border-l border-white/6 md:border-l-0",
                )}
              >
                <p className="text-2xl font-bold tracking-tight text-ink-50 tabular-nums sm:text-3xl">
                  {statValues[index]}
                </p>
                <p className="mt-1.5 text-[12px] leading-snug text-ink-400">
                  {dict.stats[key]}
                </p>
              </div>
            ))}
          </Surface>
        </section>

        {/* ================= Features ================= */}
        <section
          id="features"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6"
        >
          <div className="max-w-2xl">
            <Eyebrow>{dict.features.eyebrow}</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
              {dict.features.title}
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-400">
              {dict.features.subtitle}
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {dict.features.items.map((item, index) => {
              const Icon = featureIcons[index];
              return (
                <Surface
                  key={item.title}
                  className={cn(
                    "group p-6 transition-colors hover:border-white/14",
                    featureSpans[index],
                  )}
                >
                  <span className="grid size-11 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/12 text-brand-300 transition-colors group-hover:bg-brand-500/20">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold text-ink-50">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
                    {item.body}
                  </p>
                </Surface>
              );
            })}
          </div>
        </section>

        {/* ================= How it works ================= */}
        <section
          id="how"
          className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6"
        >
          <div className="flex flex-col items-center text-center">
            <Eyebrow>{dict.how.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">
              {dict.how.title}
            </h2>
          </div>

          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {dict.how.steps.map((step, index) => (
              <li key={step.title} className="relative">
                <Surface className="h-full p-7">
                  <span className="inline-grid size-11 place-items-center rounded-full border border-brand-500/30 bg-brand-500/12 font-mono text-[15px] font-bold text-brand-300">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold text-ink-50">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
                    {step.body}
                  </p>
                </Surface>

                {index < dict.how.steps.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-1/2 -right-3 hidden text-ink-500 md:block"
                  >
                    <ArrowRight className="size-5" />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* ================= Pricing ================= */}
        <Pricing lang={lang} copy={dict.pricing} />

        {/* ================= FAQ ================= */}
        <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <Eyebrow>{dict.faq.eyebrow}</Eyebrow>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">
              {dict.faq.title}
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {dict.faq.items.map((item) => (
              <Surface key={item.q} as="details" className="group">
                <summary className="marker-none flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-[15px] font-semibold text-ink-100">
                  {item.q}
                  <ChevronDown className="size-5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-relaxed text-ink-400">
                  {item.a}
                </p>
              </Surface>
            ))}
          </div>
        </section>

        {/* ================= Closing CTA ================= */}
        <section className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <Surface tone="strong" edge className="px-6 py-16 text-center sm:px-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-brand-500/18 blur-3xl"
            />
            <h2 className="relative mx-auto max-w-xl text-3xl font-bold sm:text-4xl">
              {dict.cta.title}
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-ink-300">
              {dict.cta.subtitle}
            </p>
            <ButtonLink href={`/${lang}/signup`} size="lg" className="relative mt-9">
              {dict.cta.button}
              <ArrowRight className="size-4" />
            </ButtonLink>
          </Surface>
        </section>
      </main>

      <SiteFooter lang={lang} copy={dict.footer} nav={dict.nav} />
    </>
  );
}
