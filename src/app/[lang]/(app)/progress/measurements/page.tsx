import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { MeasurementForm } from "@/components/progress/measurement-form";
import { MeasurementHistory } from "@/components/progress/measurement-history";
import { ProgressNav } from "@/components/progress/progress-nav";
import { Surface } from "@/components/ui/surface";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { dayKeyOf } from "@/lib/clients/schedule";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { isLocale, localeTags } from "@/lib/i18n/config";
import { getProgressCopy } from "@/lib/progress/copy";
import { loadEntries } from "@/lib/progress/queries";
import type { MeasurementEntry } from "@/lib/progress/types";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/progress/measurements">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getProgressCopy(lang);
  return { title: copy.measure.title, description: copy.meta.description };
}

/**
 * Progress — measurements (roadmap feature 14).
 *
 * A form and a log, and nothing else. The chart lives on the overview; this is
 * the screen somebody stands in front of a mirror with, so the first thing on
 * it is the field they are here to fill in.
 *
 * The form defaults to the metric that was measured most recently rather than
 * to weight. Somebody who only tracks their waist should not have to change the
 * dropdown every single time, and the app already knows which one they mean.
 */
export default async function MeasurementsPage({
  params,
}: PageProps<"/[lang]/progress/measurements">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getProgressCopy(lang);
  const localeTag = localeTags[lang];

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

  // The log being unreachable still leaves a usable form: the write will fail
  // with its own message, which is a better place to find out than an empty
  // screen that says nothing.
  let entries: MeasurementEntry[] = [];
  let available = true;

  try {
    entries = await loadEntries(user.id);
  } catch (error) {
    console.error("[progress] measurements unavailable:", error);
    available = false;
  }

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"}>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.measure.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.measure.subtitle}</p>
      </header>

      <div className="mt-6 flex flex-col gap-3.5">
        <ProgressNav lang={lang} current="measurements" copy={copy} />

        {available ? null : (
          <Surface className="flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
            <p className="text-[13px] leading-relaxed text-ink-200">
              {copy.unavailable}
            </p>
          </Surface>
        )}

        <MeasurementForm
          today={today}
          units={units}
          localeTag={localeTag}
          defaultMetric={entries[0]?.metric ?? "weight"}
          copy={copy}
        />

        <MeasurementHistory
          entries={entries}
          units={units}
          localeTag={localeTag}
          copy={copy}
        />
      </div>
    </AppShell>
  );
}
