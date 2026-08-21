import { ChevronRight, Clock, Layers } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

import { translate } from "@/db/schema/i18n";
import { AppShell } from "@/components/app/app-shell";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getRunnerDictionary } from "@/lib/runner/dictionary";
import { listRecentSessions } from "@/lib/runner/queries";
import { getRunnerSource, isDemoSource } from "@/lib/runner/source";
import { estimateMinutes, formatClock } from "@/lib/runner/timeline";

/**
 * What there is to train today.
 *
 * The library proper is feature 09 and the assigned plan is feature 13 — this
 * is the shortest path from a signed-in user to a running workout, and the
 * place the runner is reached from until those exist.
 */
export default async function WorkoutListPage({
  params,
}: PageProps<"/[lang]/workout">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getRunnerDictionary(lang);

  // Called from the day the screen is written, not the day billing lands —
  // see lib/billing/access.ts. Today it lets everyone through.
  const access = await getAccess(profile);

  if (!access.active) {
    return (
      <AppShell lang={lang} isAdmin={profile?.role === "admin"} width="narrow">
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

  const plans = await getRunnerSource().listPlans();
  const recent = await listRecentSessions(user.id);

  const dateFormat = new Intl.DateTimeFormat(localeTags[lang], {
    day: "numeric",
    month: "short",
  });

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"} width="narrow">
      <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
        {copy.list.title}
      </h1>
      <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-400">
        {copy.list.subtitle}
      </p>

      {isDemoSource() ? (
        <p className="mt-4 rounded-control border border-warn/25 bg-warn/8 px-4 py-3 text-[13px] leading-relaxed text-ink-200">
          {copy.list.demoNotice}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {plans.length === 0 ? (
          <Surface className="p-6 text-[14px] text-ink-400">
            {copy.list.empty}
          </Surface>
        ) : null}

        {plans.map((plan) => (
          <Surface
            key={plan.slug}
            as={Link}
            href={`/${lang}/workout/${plan.slug}`}
            className="group flex items-center gap-4 p-5 transition-colors hover:border-white/16 hover:bg-white/8"
          >
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[16px] font-semibold text-ink-50">
                {translate(plan.title, lang)}
              </h2>
              {plan.summary ? (
                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-400">
                  {translate(plan.summary, lang)}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink-400">
                <span className="rounded-full border border-brand-500/25 bg-brand-500/12 px-2.5 py-1 text-brand-200">
                  {copy.difficulty[plan.difficulty]}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  {plan.sets} {copy.list.sets}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {estimateMinutes(plan.estimatedSec)} {copy.list.minutes}
                </span>
              </div>
            </div>

            <ChevronRight className="size-5 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-200" />
          </Surface>
        ))}
      </div>

      {recent.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            {copy.summary.title}
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-control border border-white/6 bg-white/2 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink-100">
                    {entry.workoutTitle || entry.workoutRef}
                  </p>
                  <p className="text-[12px] text-ink-500">
                    {dateFormat.format(new Date(entry.startedAt))}
                  </p>
                </div>
                <div className="shrink-0 text-right font-mono text-[13px] tabular-nums text-ink-300">
                  <p>{formatClock(entry.elapsedSec)}</p>
                  <p className="text-[12px] text-ink-500">
                    {entry.completedSets}/{entry.totalSets}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
