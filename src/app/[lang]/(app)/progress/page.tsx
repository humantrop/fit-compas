import type { Metadata } from "next";
import { AlertTriangle, LineChart } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { StreakCard } from "@/components/dashboard/streak-card";
import { ActivityHeatmap } from "@/components/progress/activity-heatmap";
import { ChartControls } from "@/components/progress/chart-controls";
import { MetricChart } from "@/components/progress/metric-chart";
import { PhotoStrip } from "@/components/progress/photo-strip";
import { ProgressNav } from "@/components/progress/progress-nav";
import { TotalsTiles } from "@/components/progress/totals-tiles";
import { TrainingChart } from "@/components/progress/training-chart";
import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { dayKeyOf } from "@/lib/clients/schedule";
import { getDashboardCopy } from "@/lib/dashboard/copy";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getProgressCopy } from "@/lib/progress/copy";
import { isBodyMetric } from "@/lib/progress/metrics";
import { loadOverview } from "@/lib/progress/queries";
import { DEFAULT_RANGE, isRangeKey, sliceSeries } from "@/lib/progress/range";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/progress">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getProgressCopy(lang);
  return { title: copy.meta.title, description: copy.meta.description };
}

/**
 * Progress — the overview (roadmap feature 14).
 *
 * Two halves, and the split is the point. The top half is the body: what the
 * tape and the scale said, which only this feature records. The bottom half is
 * the training: the streak, the weekly columns and the totals, all read out of
 * `workout_sessions` through the dashboard's own reader rather than counted
 * again here. A progress screen with its own tally of workouts is a second
 * answer to a question the dashboard already answers, and two answers to one
 * question is how they end up disagreeing.
 *
 * Which metric is charted and how far back it goes live in the query string,
 * the same rule the library's filters and the plan's month follow: the view is
 * a link somebody can send, Back means something, and the whole screen stays
 * server-rendered.
 *
 * `connection()` because everything here is per-user and time-dependent:
 * `app/[lang]/layout.tsx` has `generateStaticParams`, so without it the build
 * tries to prerender this page against a database with no session — the failure
 * documented in the roadmap's "zamke" section.
 */
export default async function ProgressPage({
  params,
  searchParams,
}: PageProps<"/[lang]/progress">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getProgressCopy(lang);
  const localeTag = localeTags[lang];

  // Called from the day the screen is written, not the day billing lands —
  // see lib/billing/access.ts. Today it lets everyone through.
  const access = await getAccess(profile);

  if (!access.active) {
    return (
      <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
        <Surface tone="strong" edge className="p-7">
          <h1 className="text-xl font-semibold text-ink-50">{copy.access.title}</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            {copy.access.body}
          </p>
        </Surface>
      </AppShell>
    );
  }

  const timeZone = await getTimeZone();
  const today = dayKeyOf(new Date(), timeZone);
  const units = profile?.units ?? "metric";

  const overview = await loadOverview(user.id, timeZone, today);

  const query = await searchParams;
  const measured = overview.series.map((series) => series.metric);

  // The first metric with data, not a hard-coded "weight": somebody who only
  // tracks their waist should not open this screen on an empty chart.
  const metric =
    isBodyMetric(query.m) && measured.includes(query.m) ? query.m : measured[0];
  const range = isRangeKey(query.r) ? query.r : DEFAULT_RANGE;

  const selected = overview.series.find((series) => series.metric === metric);

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.subtitle}</p>
      </header>

      <div className="mt-6 flex flex-col gap-3.5">
        <ProgressNav lang={lang} current="overview" copy={copy} />

        {overview.available ? null : <Notice>{copy.unavailable}</Notice>}
        {overview.trainingAvailable ? null : (
          <Notice>{copy.trainingUnavailable}</Notice>
        )}

        {/* ---------------------------------------------------------- body */}
        {selected ? (
          <>
            <h2 className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {copy.overview.bodyTitle}
            </h2>

            <ChartControls
              basePath={`/${lang}/progress`}
              metrics={measured}
              metric={selected.metric}
              range={range}
              copy={copy}
            />

            <MetricChart
              series={sliceSeries(selected, today, range)}
              units={units}
              localeTag={localeTag}
              copy={copy}
            />
          </>
        ) : overview.available ? (
          <Surface tone="strong" edge className="flex flex-col gap-5 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 text-brand-300">
                <LineChart className="size-6" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-ink-50">
                  {copy.overview.bodyEmpty.title}
                </h2>
                <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-300">
                  {copy.overview.bodyEmpty.body}
                </p>
              </div>
            </div>

            <ButtonLink
              href={`/${lang}/progress/measurements`}
              className="self-start"
            >
              {copy.overview.bodyEmpty.action}
            </ButtonLink>
          </Surface>
        ) : null}

        {/* ------------------------------------------------------ training */}
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* The dashboard's own card, with the dashboard's own copy. The same
              number about the same days deserves one wording, not two. */}
          <StreakCard
            streak={overview.streak}
            copy={getDashboardCopy(lang).streak}
            localeTag={localeTag}
          />

          <ActivityHeatmap
            days={overview.training}
            today={today}
            localeTag={localeTag}
            copy={copy}
          />
        </div>

        <TrainingChart
          days={overview.training}
          today={today}
          localeTag={localeTag}
          copy={copy}
        />

        <div className="grid gap-3.5 lg:grid-cols-2">
          <TotalsTiles
            totals={overview.totals}
            localeTag={localeTag}
            copy={copy}
          />

          <PhotoStrip
            photos={overview.photos}
            lang={lang}
            localeTag={localeTag}
            copy={copy}
          />
        </div>
      </div>
    </AppShell>
  );
}

/** A row that explains why part of the screen is empty. */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Surface className="flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
      <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
      <p className="text-[13px] leading-relaxed text-ink-200">{children}</p>
    </Surface>
  );
}
