import type { Metadata } from "next";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { PlanCalendar } from "@/components/plan/plan-calendar";
import { PlanDayPanel } from "@/components/plan/plan-day-panel";
import { PlanHeader } from "@/components/plan/plan-header";
import { UpcomingList } from "@/components/plan/upcoming-list";
import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { dayKeyOf, isValidDayKey, shiftDay } from "@/lib/clients/schedule";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getPlanCopy } from "@/lib/plan/copy";
import {
  isValidMonthKey,
  monthGridRange,
  monthOf,
  type MonthKey,
} from "@/lib/plan/month";
import { loadPlan } from "@/lib/plan/queries";
import { isDemoSource } from "@/lib/runner/source";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/plan">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getPlanCopy(lang);
  return { title: copy.meta.title, description: copy.meta.description };
}

/** How far ahead the list under the calendar looks. */
const UPCOMING_DAYS = 14;

/**
 * The client's own plan (roadmap feature 13).
 *
 * The calendar is not stored anywhere. Feature 12 made it a pure function of
 * `client_assignments.start_date` and the program grid, and this screen keeps
 * that: it calls the same `planDayFor` the trainer's screen calls, then lays
 * this client's own moves over the result. So a program the coach edits still
 * reaches everyone on it, and the two sides cannot end up reading different
 * weeks off the same plan.
 *
 * Which month is open and which day is selected live in the query string
 * rather than in component state — the same rule the library and the exercise
 * list follow. A plan someone is looking at is a link they can send, Back
 * means something, and the whole screen except the day panel stays server-
 * rendered.
 *
 * `connection()` because everything here is per-user and time-dependent:
 * `app/[lang]/layout.tsx` has `generateStaticParams`, so without it the build
 * tries to prerender this page against a database with no session — the
 * failure documented in the roadmap's "zamke" section.
 */
export default async function PlanPage({
  params,
  searchParams,
}: PageProps<"/[lang]/plan">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getPlanCopy(lang);
  const localeTag = localeTags[lang];
  const basePath = `/${lang}/plan`;

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
  const today = dayKeyOf(new Date(), timeZone);

  const query = await searchParams;
  const rawMonth = query.m;
  const month: MonthKey = isValidMonthKey(rawMonth) ? rawMonth : monthOf(today);

  const grid = monthGridRange(month);
  const upcomingEnd = shiftDay(today, UPCOMING_DAYS - 1);

  // One window covering both the grid and the list, so the whole screen is a
  // single pass over the plan rather than two that could disagree at the edges.
  const from = grid.from < today ? grid.from : today;
  const to = grid.to > upcomingEnd ? grid.to : upcomingEnd;

  const plan = await loadPlan(user.id, timeZone, today, from, to);

  const rawDay = query.d;
  const selected =
    isValidDayKey(rawDay) && rawDay >= from && rawDay <= to ? rawDay : today;

  const calendarDays = plan.days.filter(
    (day) => day.day >= grid.from && day.day <= grid.to,
  );
  const upcoming = plan.days.filter(
    (day) => day.day >= today && day.day <= upcomingEnd,
  );
  const selectedDay = plan.days.find((day) => day.day === selected) ?? null;

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.subtitle}</p>
      </header>

      {plan.program ? (
        <>
          {plan.logAvailable ? null : (
            <Surface className="mt-5 flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
              <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
              <p className="text-[13px] leading-relaxed text-ink-200">
                {copy.logUnavailable}
              </p>
            </Surface>
          )}

          <div className="mt-6 flex flex-col gap-3.5">
            <PlanHeader
              plan={plan}
              lang={lang}
              localeTag={localeTag}
              copy={copy}
            />

            <div className="grid gap-3.5 lg:grid-cols-2">
              <PlanCalendar
                days={calendarDays}
                month={month}
                selected={selected}
                today={today}
                basePath={basePath}
                localeTag={localeTag}
                copy={copy}
              />

              {selectedDay ? (
                <PlanDayPanel
                  day={selectedDay}
                  lang={lang}
                  localeTag={localeTag}
                  today={today}
                  // The runner still serves the built-in demo plans, so a
                  // planned workout has nothing to open yet. Saying so beats a
                  // button that leads to a 404 — see lib/runner/source.ts.
                  runnerReady={!isDemoSource()}
                  copy={copy}
                />
              ) : null}
            </div>

            <UpcomingList
              days={upcoming}
              lang={lang}
              localeTag={localeTag}
              basePath={basePath}
              copy={copy}
            />
          </div>
        </>
      ) : (
        <Surface tone="strong" edge className="mt-6 flex flex-col gap-5 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 text-brand-300">
              <CalendarClock className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-ink-50">
                {copy.empty.title}
              </h2>
              <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-ink-300">
                {copy.empty.body}
              </p>
            </div>
          </div>

          <ButtonLink href={`/${lang}/workout`} variant="secondary" className="self-start">
            {copy.empty.action}
          </ButtonLink>
        </Surface>
      )}
    </AppShell>
  );
}
