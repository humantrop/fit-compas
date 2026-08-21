import { AlertTriangle, LogOut, MailCheck, MailWarning, Shield } from "lucide-react";
import { notFound } from "next/navigation";

import { Button, ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Logo } from "@/components/site/logo";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { signOutAction } from "@/lib/auth/actions";
import { getProfile, requireUser } from "@/lib/auth/session";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Placeholder. The real bento dashboard is step 8 — this exists so the auth
 * loop (signup -> confirm -> login -> protected page -> sign out) can be
 * verified end to end before any of it is built on top.
 */
export default async function DashboardPage({
  params,
}: PageProps<"/[lang]/dashboard">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.dashboard;

  const user = await requireUser(lang);
  const profile = await getProfile();

  const name = profile?.full_name ?? user.email?.split("@")[0] ?? "";
  const confirmed = Boolean(user.email_confirmed_at);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-white/8 px-4 pt-safe sm:px-6">
        <div className="py-4">
          <Logo />
        </div>
        <div className="flex items-center gap-1.5">
          {profile?.role === "admin" ? (
            <ButtonLink href={`/${lang}/admin`} variant="secondary" size="sm">
              <Shield className="size-4" />
              <span className="hidden sm:inline">{copy.adminLink}</span>
            </ButtonLink>
          ) : null}

          <LocaleSwitcher current={lang} />
          <form action={signOutAction}>
            <input type="hidden" name="lang" value={lang} />
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">{copy.signOut}</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {copy.greeting}
          {name ? `, ${name}` : ""}.
        </h1>

        <div className="mt-8 grid gap-4 sm:grid-cols-[1.6fr_1fr]">
          <Surface tone="strong" edge className="p-7">
            <h2 className="text-lg font-semibold text-ink-50">
              {copy.placeholderTitle}
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-400">
              {copy.placeholderBody}
            </p>
          </Surface>

          <Surface className="flex flex-col gap-4 p-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {copy.signedInAs}
              </p>
              <p className="mt-1.5 truncate text-[14px] font-medium text-ink-100">
                {user.email}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/25 bg-brand-500/12 px-3 py-1.5 text-[11px] font-semibold text-brand-200">
                {profile?.role === "admin" ? copy.roleAdmin : copy.roleClient}
              </span>

              <span
                className={
                  confirmed
                    ? "inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/12 px-3 py-1.5 text-[11px] font-semibold text-success"
                    : "inline-flex items-center gap-1.5 rounded-full border border-warn/25 bg-warn/12 px-3 py-1.5 text-[11px] font-semibold text-warn"
                }
              >
                {confirmed ? (
                  <MailCheck className="size-3.5" />
                ) : (
                  <MailWarning className="size-3.5" />
                )}
                {confirmed ? copy.emailVerified : copy.emailPending}
              </span>
            </div>
          </Surface>
        </div>

        {/* Surfaces the one setup step that is easy to forget: the trigger that
            creates a profiles row for each new auth user. */}
        {profile ? null : (
          <Surface className="mt-4 flex items-start gap-3 border-warn/25 bg-warn/8 p-5">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warn" />
            <p className="text-[13px] leading-relaxed text-ink-200">
              {copy.noProfile}
            </p>
          </Surface>
        )}
      </main>
    </div>
  );
}
