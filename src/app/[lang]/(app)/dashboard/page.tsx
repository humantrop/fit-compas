import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { QuickLinks } from "@/components/dashboard/quick-links";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatTiles } from "@/components/dashboard/stat-tiles";
import { StreakCard } from "@/components/dashboard/streak-card";
import { SuggestionList } from "@/components/dashboard/suggestion-list";
import { TodayCard } from "@/components/dashboard/today-card";
import { WeekStrip } from "@/components/dashboard/week-strip";
import { Surface } from "@/components/ui/surface";
import { isUnitSystem } from "@/lib/account/units";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { getDashboardCopy } from "@/lib/dashboard/copy";
import { dayKeyOf, shiftDay, weekdayIndex, weekOf } from "@/lib/dashboard/days";
import { greetingFor } from "@/lib/dashboard/format";
import { loadDashboardStats, totalsSince } from "@/lib/dashboard/queries";
import { getScheduleSource } from "@/lib/dashboard/schedule-source";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import type { ScheduledDay, WeekDay } from "@/lib/dashboard/types";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { listRecentSessions } from "@/lib/runner/queries";
import { getRunnerSource, isDemoSource } from "@/lib/runner/source";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/dashboard">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getDashboardCopy(lang);
  return { title: copy.meta.title, description: copy.meta.description };
}

/** How many workouts to offer while nothing is assigned. */
const SUGGESTIONS = 4;

/**
 * The client's home screen (roadmap feature 11).
 *
 * Everything on it is derived from what the runner already wrote down —
 * `workout_sessions`, one row per performed workout — rather than from a
 * second set of counters kept in parallel. What the coach *planned* comes
 * through `lib/dashboard/schedule-source.ts`, which features 12 and 13 filled
 * in: the assignment, the program grid and the client's own moved days. A
 * client with no program still gets "no plan assigned yet" rather than an
 * empty week, which is a true statement instead of a blank that reads as a
 * bug.
 *
 * `connection()` because everything below is per-user and time-dependent:
 * `app/[lang]/layout.tsx` has `generateStaticParams`, so without it the build
 * tries to prerender this page against a database with no session — the
 * failure documented in the roadmap's "zamke" section.
 */
export default async function DashboardPage({
  params,
}: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getDashboardCopy(lang);
  const localeTag = localeTags[lang];
  // Feature 16. Tonnage is the one number on this screen carrying a unit, and
  // the unit is a property of the reader rather than of the log.
  const units = profile && isUnitSystem(profile.units) ? profile.units : "metric";

  // Called from the day the screen is written, not the day billing lands —
  // see lib/billing/access.ts. Today it lets everyone through.
  const access = await getAccess(profile);

  if (!access.active) {
    return (
      <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
        <Surface tone="strong" edge className="p-7">
          <h1 className="text-xl font-semibold text-ink-50">
            {copy.access.title}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            {copy.access.body}
          </p>
        </Surface>
      </AppShell>
    );
  }

  const timeZone = await getTimeZone();
  const now = new Date();
  const today = dayKeyOf(now, timeZone);
  const week = weekOf(today);

  const [stats, scheduled, plans, recent] = await Promise.all([
    loadDashboardStats(user.id, timeZone, today),
    getScheduleSource().range(user.id, week[0], week[6]),
    getRunnerSource().listPlans(),
    listRecentSessions(user.id, 4),
  ]);

  const activityByDay = new Map(stats.days.map((day) => [day.day, day]));
  const scheduleByDay = new Map<string, ScheduledDay>(
    scheduled.days.map((day) => [day.day, day]),
  );

  const weekDays: WeekDay[] = week.map((day) => {
    const activity = activityByDay.get(day) ?? null;
    return {
      day,
      index: weekdayIndex(day),
      isToday: day === today,
      isFuture: day > today,
      done: (activity?.sessions ?? 0) > 0,
      activity,
      scheduled: scheduleByDay.get(day) ?? null,
    };
  });

  // Something to train that is not the thing trained yesterday. Falls back to
  // the first plan when everything on offer is recent — with three demo plans
  // that happens on day three.
  const recentRefs = new Set(recent.map((session) => session.workoutRef));
  const suggestions = plans.slice(0, SUGGESTIONS);
  const suggestion =
    suggestions.find((plan) => !recentRefs.has(plan.slug)) ??
    suggestions[0] ??
    null;

  const greeting = greetingFor(now, timeZone, copy.greeting);
  const name = profile?.full_name?.split(" ")[0] ?? "";
  const dateLabel = new Intl.DateTimeFormat(localeTag, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone,
  }).format(now);

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {name ? `${greeting}, ${name}.` : `${greeting}.`}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.subtitle}</p>
      </header>

      {/* The trigger that creates a profiles row for each new auth user is the
          one setup step that is easy to forget, and the symptom otherwise is
          just a nameless greeting. */}
      {profile ? null : (
        <Surface className="mt-5 flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
          <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
          <p className="text-[13px] leading-relaxed text-ink-200">
            {copy.noProfile}
          </p>
        </Surface>
      )}

      <div className="mt-6 grid gap-3.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TodayCard
            lang={lang}
            copy={copy.today}
            dateLabel={dateLabel}
            open={stats.open}
            doneToday={stats.streak.activeToday}
            scheduled={scheduleByDay.get(today) ?? null}
            schedulePending={!scheduled.assigned}
            suggestion={suggestion}
          />
        </div>

        <StreakCard
          streak={stats.streak}
          copy={copy.streak}
          localeTag={localeTag}
        />

        <div className="lg:col-span-2">
          <WeekStrip days={weekDays} copy={copy.week} localeTag={localeTag} />
        </div>

        <RecentList
          lang={lang}
          sessions={recent}
          copy={copy.recent}
          localeTag={localeTag}
        />

        <div className="lg:col-span-3">
          <StatTiles
            rows={[
              {
                label: copy.stats.ranges.week,
                totals: totalsSince(stats.days, shiftDay(today, -6)),
              },
              {
                label: copy.stats.ranges.month,
                totals: totalsSince(stats.days, shiftDay(today, -29)),
              },
              { label: copy.stats.ranges.all, totals: stats.allTime },
            ]}
            copy={copy.stats}
            localeTag={localeTag}
            units={units}
            unavailable={!stats.available}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <SuggestionList
          lang={lang}
          plans={suggestions}
          copy={copy.suggestions}
          demo={isDemoSource()}
        />

        <QuickLinks lang={lang} copy={copy.quick} />
      </div>
    </AppShell>
  );
}
