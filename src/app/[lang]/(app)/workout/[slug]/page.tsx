import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { translate } from "@/db/schema/i18n";
import { RunnerShell } from "@/components/runner/runner-shell";
import { WorkoutRunner } from "@/components/runner/workout-runner";
import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { isLocale } from "@/lib/i18n/config";
import { getRunnerDictionary } from "@/lib/runner/dictionary";
import { loadActiveSession } from "@/lib/runner/queries";
import { getRunnerSource } from "@/lib/runner/source";
import { buildTimeline } from "@/lib/runner/timeline";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/workout/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};

  const plan = await getRunnerSource().getPlan(slug);
  return plan ? { title: translate(plan.title, lang) } : {};
}

/**
 * The runner.
 *
 * Everything the workout needs is resolved here, on the server: the plan, the
 * timeline built from it, and whichever session is already open. The client
 * component gets a finished object and never fetches — a runner that has to
 * wait for data between sets is a runner that stutters in the gym, on the
 * exact connection a gym gives you.
 */
export default async function WorkoutRunnerPage({
  params,
}: PageProps<"/[lang]/workout/[slug]">) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getRunnerDictionary(lang);
  const backHref = `/${lang}/workout`;

  // Every screen that shows paid content calls this from the day it is
  // written. See lib/billing/access.ts — feature 18 changes the function, not
  // this page.
  const access = await getAccess(profile);

  if (!access.active) {
    return (
      <RunnerShell lang={lang}>
        <Surface tone="strong" edge className="p-7">
          <h1 className="text-xl font-semibold text-ink-50">
            {copy.access.title}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            {copy.access.body}
          </p>
          <ButtonLink href={backHref} variant="secondary" className="mt-5">
            {copy.summary.backToList}
          </ButtonLink>
        </Surface>
      </RunnerShell>
    );
  }

  const plan = await getRunnerSource().getPlan(slug);

  if (!plan) {
    return (
      <RunnerShell lang={lang}>
        <Surface className="p-7">
          <h1 className="text-xl font-semibold text-ink-50">
            {copy.notFound.title}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
            {copy.notFound.body}
          </p>
          <ButtonLink href={backHref} variant="secondary" className="mt-5">
            {copy.summary.backToList}
          </ButtonLink>
        </Surface>
      </RunnerShell>
    );
  }

  const timeline = buildTimeline(plan);
  const { state, loggingAvailable } = await loadActiveSession(user.id, plan.slug);

  return (
    <RunnerShell lang={lang}>
      <WorkoutRunner
        lang={lang}
        plan={plan}
        timeline={timeline}
        session={state}
        loggingAvailable={loggingAvailable}
        copy={copy}
        backHref={backHref}
      />
    </RunnerShell>
  );
}
