import { notFound, redirect } from "next/navigation";

import { isLocale } from "@/lib/i18n/config";

/**
 * /library has no screen of its own — exercises are the shelf everything else
 * is built out of, so that is where the reader lands.
 */
export default async function LibraryIndexPage({
  params,
}: PageProps<"/[lang]/library">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  redirect(`/${lang}/library/exercises`);
}
