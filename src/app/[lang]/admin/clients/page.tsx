import { notFound } from "next/navigation";
import { connection } from "next/server";

import { ClientList } from "@/components/admin/clients/client-list";
import { getClientsCopy } from "@/lib/clients/copy";
import { getAdminTimeZone, listClients } from "@/lib/clients/queries";
import { dayKeyOf } from "@/lib/clients/schedule";
import { isLocale } from "@/lib/i18n/config";

/* No generateStaticParams: the admin layout reads the session cookie to check
   the role, so every page under it renders per request anyway. */

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/admin/clients">) {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  return { title: getClientsCopy(lang).metaTitle };
}

export default async function ClientsPage({
  params,
}: PageProps<"/[lang]/admin/clients">) {
  // Request-time, never prerendered: the parent [lang] layout has
  // generateStaticParams, so without this the build worker would try to render
  // this page with no session and reach for the database to do it.
  await connection();

  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const copy = getClientsCopy(lang);
  const [clients, timeZone] = await Promise.all([
    listClients(),
    getAdminTimeZone(),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title}</h1>
        <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>
      </div>

      <ClientList
        clients={clients}
        lang={lang}
        copy={copy}
        today={dayKeyOf(new Date(), timeZone)}
        timeZone={timeZone}
      />
    </div>
  );
}
