import { notFound } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { LockedNotice } from "@/components/library/notice";
import { requireProfile } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { isLocale } from "@/lib/i18n/config";
import { getLibraryCopy } from "@/lib/library/copy";

/**
 * The gate for the whole library.
 *
 * The roadmap rule from feature 09 onwards is that any screen showing paid
 * content calls `getAccess()` from the day it is written, even while that
 * function lets everyone through. Putting the call in the layout rather than in
 * each page makes it structural: a page added under /library cannot forget it,
 * because a locked reader never gets `children` rendered at all — which also
 * means the page's queries never run.
 *
 * Feature 18 changes the body of `getAccess()` and this file stays as it is.
 *
 * The chrome around it is `AppShell` (feature 11). It used to be a
 * library-local copy of the header, written that way so two parallel features
 * could not fight over one layout file; that copy is gone now that the real
 * shell exists.
 */
export default async function LibraryLayout({
  children,
  params,
}: LayoutProps<"/[lang]/library">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const profile = await requireProfile(lang);
  const access = await getAccess(profile);
  const copy = getLibraryCopy(lang);

  return (
    <AppShell lang={lang} isAdmin={profile.role === "admin"}>
      {access.active ? (
        children
      ) : (
        <LockedNotice
          title={copy.locked.title}
          body={copy.locked.body}
          action={{
            href: `/${lang}/dashboard`,
            label: copy.locked.action,
          }}
        />
      )}
    </AppShell>
  );
}
