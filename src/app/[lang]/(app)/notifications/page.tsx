import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppShell } from "@/components/app/app-shell";
import { InboxList } from "@/components/notifications/inbox-list";
import { getProfile, requireUser } from "@/lib/auth/session";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { isLocale } from "@/lib/i18n/config";
import { getNotificationsCopy } from "@/lib/notifications/copy";
import { catchUp } from "@/lib/notifications/dispatch";
import { getInbox } from "@/lib/notifications/queries";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/notifications">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  return { title: getNotificationsCopy(lang).inbox.metaTitle };
}

/**
 * The client's inbox (roadmap feature 15).
 *
 * Not behind `getAccess()`, and that is deliberate. Everything else on the
 * client side shows paid content, so it asks first; a notification is the
 * channel the trainer uses to *reach* somebody — including somebody whose
 * subscription has lapsed and who needs to be told. Locking the inbox behind
 * the paywall would silence exactly the message that matters most at that
 * moment. The notifications themselves link into gated screens, and those
 * screens do the asking.
 *
 * `connection()` because `app/[lang]/layout.tsx` has `generateStaticParams` and
 * the build worker would otherwise try to prerender a per-user page against a
 * database with no session — the failure documented in the roadmap.
 */
export default async function NotificationsPage({
  params,
}: PageProps<"/[lang]/notifications">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getNotificationsCopy(lang);

  // Opening the inbox is also a dispatch tick — schedules only, never the email
  // pass. On a deployment whose cron fires once a day this is what makes the
  // 09:00 reminder appear when somebody actually looks, and it costs one
  // indexed query when nothing is due. It swallows its own failures: an inbox
  // that renders is worth more than a dispatcher that is on time.
  await catchUp();

  const [inbox, timeZone] = await Promise.all([getInbox(user.id), getTimeZone()]);

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"} width="narrow">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.inbox.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.inbox.subtitle}</p>
      </header>

      <InboxList inbox={inbox} lang={lang} copy={copy} timeZone={timeZone} />
    </AppShell>
  );
}
