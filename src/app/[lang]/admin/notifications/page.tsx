import { Mail, TriangleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MessageComposer } from "@/components/admin/notifications/message-composer";
import { MessageList } from "@/components/admin/notifications/message-list";
import { Surface } from "@/components/ui/surface";
import { getAdminTimeZone } from "@/lib/clients/queries";
import { dayKeyOf } from "@/lib/clients/schedule";
import { isLocale } from "@/lib/i18n/config";
import { getNotificationsCopy } from "@/lib/notifications/copy";
import { catchUp } from "@/lib/notifications/dispatch";
import { isMailConfigured } from "@/lib/notifications/mail";
import {
  listClientOptions,
  listMessages,
  notificationsReady,
} from "@/lib/notifications/queries";

/* No generateStaticParams: the admin layout reads the session cookie to check
   the role, so every page under it renders per request anyway. */

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/notifications">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  return { title: getNotificationsCopy(lang).metaTitle };
}

export default async function NotificationsPage({
  params,
}: PageProps<"/[lang]/admin/notifications">) {
  // Request-time, never prerendered: the parent [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // this page with no session and reach for the database to do it.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const copy = getNotificationsCopy(lang);
  const ready = await notificationsReady();

  // Opening this screen is also a dispatch tick. The cron job is the real
  // clock, but its cadence is a deployment detail — on a Hobby plan it fires
  // once a day — and the trainer looking at the list should be looking at the
  // current state of it rather than at yesterday's. Schedules only; the email
  // pass stays on the cron so no page render waits on a mail server.
  if (ready) await catchUp();

  const [messages, clients, timeZone] = await Promise.all([
    ready ? listMessages() : Promise.resolve([]),
    listClientOptions(),
    getAdminTimeZone(),
  ]);

  const now = new Date();

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      {!ready ? (
        <Surface
          tone="bare"
          className="flex items-start gap-3 border-amber-400/25 bg-amber-400/8 p-5"
        >
          <TriangleAlert className="mt-0.5 size-4.5 shrink-0 text-amber-300" />
          <p className="text-[13px] leading-relaxed text-amber-100">
            {copy.setup}{" "}
            <code className="text-amber-200">
              supabase/migrations/0015_notifications.sql
            </code>
          </p>
        </Surface>
      ) : null}

      <MessageComposer
        lang={lang}
        copy={copy}
        clients={clients}
        timeZone={timeZone}
        today={dayKeyOf(now, timeZone)}
        now={now.toISOString()}
        mailConfigured={isMailConfigured()}
      />

      <Surface
        tone="bare"
        className="flex items-start gap-3 p-4 text-[12px] leading-relaxed text-ink-400"
      >
        <Mail className="mt-0.5 size-4 shrink-0 text-ink-500" />
        <span>
          {isMailConfigured() ? copy.mail.configured : copy.mail.missing}{" "}
          {isMailConfigured() ? null : (
            <span className="text-ink-500">{copy.mail.missingHint}</span>
          )}
        </span>
      </Surface>

      <MessageList messages={messages} lang={lang} copy={copy} />
    </div>
  );
}
