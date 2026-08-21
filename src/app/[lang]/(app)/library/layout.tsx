import { notFound } from "next/navigation";

import { LibraryChrome } from "@/components/library/library-chrome";
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
    <LibraryChrome lang={lang} isAdmin={profile.role === "admin"} copy={copy}>
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
    </LibraryChrome>
  );
}
