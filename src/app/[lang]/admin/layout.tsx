import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAccountCopy } from "@/lib/account/copy";
import { requireAdmin } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * The gate for the whole admin area.
 *
 * `requireAdmin` runs here rather than in every page: this layout is rendered
 * on the server for any request that enters /admin from outside, and a client
 * side navigation can only happen from a page that already passed it. The
 * proxy redirect in front of this is a UX shortcut — it sees a cookie, not a
 * role. Mutations do not rely on either: every Server Action re-checks.
 */
export default async function AdminLayout({
  children,
  params,
}: LayoutProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await requireAdmin(lang);

  const dict = await getDictionary(lang);

  return (
    <AdminShell
      lang={lang}
      copy={dict.admin.nav}
      accountLabel={getAccountCopy(lang).nav}
    >
      {children}
    </AdminShell>
  );
}
