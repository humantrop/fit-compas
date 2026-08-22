import { ArrowLeft, MailWarning } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ActivityList } from "@/components/admin/clients/activity-list";
import { AssignmentPanel } from "@/components/admin/clients/assignment-panel";
import { NotesPanel } from "@/components/admin/clients/notes-panel";
import { ScheduleList } from "@/components/admin/clients/schedule-list";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { isUnitSystem } from "@/lib/account/units";
import { getProfile } from "@/lib/auth/session";
import { getClientsCopy } from "@/lib/clients/copy";
import {
  displayName,
  formatDayLong,
  formatMoment,
  initials,
} from "@/lib/clients/format";
import { getClient, listProgramOptions } from "@/lib/clients/queries";
import type { AssignmentView } from "@/lib/clients/types";
import { isLocale, localeTags, type Locale } from "@/lib/i18n/config";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/clients/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !UUID.test(id)) return {};

  const copy = getClientsCopy(lang);
  const client = await getClient(id);

  return {
    title: client
      ? `${displayName(client.profile.fullName, client.profile.email)} · ${copy.metaTitle}`
      : copy.metaTitle,
  };
}

export default async function ClientPage({
  params,
}: PageProps<"/[lang]/admin/clients/[id]">) {
  await connection();

  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();
  // A non-uuid would reach Postgres as an invalid cast and come back as a 500,
  // which is the wrong answer to a made-up URL.
  if (!UUID.test(id)) notFound();

  const copy = getClientsCopy(lang);
  const detail = copy.detail;

  const [client, programs, me] = await Promise.all([
    getClient(id),
    listProgramOptions(),
    getProfile(),
  ]);

  if (!client) notFound();

  // The trainer's units, not the client's — see ActivityList.
  const units = me && isUnitSystem(me.units) ? me.units : "metric";

  const tag = localeTags[lang];
  const name = displayName(client.profile.fullName, client.profile.email);
  const lastSignIn = formatMoment(client.profile.lastSignInAt, tag, client.timeZone);
  const joined = formatMoment(client.profile.joinedAt, tag, client.timeZone);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${lang}/admin/clients`}
        className="inline-flex w-fit items-center gap-2 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft className="size-4" />
        {detail.back}
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-[16px] font-semibold text-ink-200">
          {initials(client.profile.fullName, client.profile.email)}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold sm:text-3xl">{name}</h1>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-400">
            {client.profile.fullName && client.profile.email ? (
              <span className="truncate">{client.profile.email}</span>
            ) : null}

            {joined ? (
              <span>
                {detail.joined}: {joined}
              </span>
            ) : null}

            <span>
              {detail.lastSignIn}: {lastSignIn ?? copy.list.never}
            </span>

            {client.profile.emailConfirmed ? null : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                <MailWarning className="size-3" />
                {copy.list.notConfirmed}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <AssignmentPanel
            userId={client.profile.id}
            assignment={client.assignment}
            programs={programs}
            progress={client.progress}
            planEnd={client.planEnd}
            lang={lang}
            copy={copy}
            today={client.today}
          />

          <Surface className="flex flex-col gap-4 p-6">
            <div>
              <h2 className="text-[15px] font-semibold text-ink-100">
                {detail.scheduleHeading}
              </h2>
              <p className="mt-1 text-[12px] text-ink-500">{detail.scheduleHint}</p>
            </div>

            <ScheduleList entries={client.schedule} lang={lang} copy={copy} />
          </Surface>
        </div>

        <div className="flex flex-col gap-5">
          <NotesPanel
            userId={client.profile.id}
            notes={client.notes}
            lang={lang}
            copy={copy}
            timeZone={client.timeZone}
          />

          <ActivityList
            totals={client.totals}
            sessions={client.sessions}
            available={client.logAvailable}
            lang={lang}
            copy={copy}
            units={units}
            timeZone={client.timeZone}
          />

          <History history={client.history} lang={lang} copy={copy} />
        </div>
      </div>
    </div>
  );
}

function History({
  history,
  lang,
  copy,
}: {
  history: AssignmentView[];
  lang: Locale;
  copy: ReturnType<typeof getClientsCopy>;
}) {
  const detail = copy.detail;
  const tag = localeTags[lang];

  return (
    <Surface tone="bare" className="flex flex-col gap-3 p-5">
      <h2 className="text-[14px] font-semibold text-ink-100">
        {detail.historyHeading}
      </h2>

      {history.length === 0 ? (
        <p className="text-[13px] text-ink-500">{detail.historyEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {history.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px]"
            >
              <Link
                href={`/${lang}/admin/programs/${row.programId}`}
                className="min-w-0 flex-1 truncate text-ink-200 transition-colors hover:text-brand-200"
              >
                {translate(row.programTitle, lang)}
              </Link>

              <span className="text-[12px] text-ink-500">
                {detail.historyRange
                  .replace("{from}", formatDayLong(row.startDate, tag))
                  .replace(
                    "{to}",
                    row.endedOn ? formatDayLong(row.endedOn, tag) : "—",
                  )}
              </span>

              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {copy.statuses[row.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
