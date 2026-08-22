import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { PasswordForm } from "@/components/account/password-form";
import { PreferencesForm } from "@/components/account/preferences-form";
import { ProfileForm } from "@/components/account/profile-form";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { fill, getAccountCopy } from "@/lib/account/copy";
import { loadEmailPreference } from "@/lib/account/queries";
import { isUnitSystem } from "@/lib/account/units";
import { signOutAction } from "@/lib/auth/actions";
import { getProfile, requireUser } from "@/lib/auth/session";
import { isLocale, localeTags } from "@/lib/i18n/config";

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/account">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const copy = getAccountCopy(lang);
  return { title: copy.meta.title, description: copy.meta.description };
}

/**
 * Account and settings (roadmap feature 16).
 *
 * **This screen is not gated.** Every other page under `(app)` calls
 * `getAccess()` before it renders anything, per the rule that has held since
 * feature 09. This one deliberately does not, and the reason is the day the
 * rule starts to bite: when feature 18 turns the paywall on, somebody whose
 * subscription lapsed still has to be able to change their password, switch
 * the app back to a language they read, and stop the email. Locking the
 * settings behind the subscription would mean the only way out of a locked
 * account is to email the trainer. Nothing here is paid content — it is the
 * account itself.
 *
 * `await connection()` for the reason written up in the roadmap: the parent
 * `[lang]/layout.tsx` has `generateStaticParams`, so without it the build tries
 * to prerender this page with no session and hangs on the database call until
 * the worker times out.
 */
export default async function AccountPage({ params }: PageProps<"/[lang]/account">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await connection();

  const user = await requireUser(lang);
  const profile = await getProfile();
  const copy = getAccountCopy(lang);
  const localeTag = localeTags[lang];

  const emailNotifications = await loadEmailPreference(user.id);

  // A profile row is created by a trigger at sign-up, so its absence means
  // something went wrong rather than that this is a new account. The screen
  // still works: the password card needs only the session, and the preferences
  // fall back to what the reader is currently looking at.
  const units = profile && isUnitSystem(profile.units) ? profile.units : "metric";
  const savedLocale =
    profile?.locale && isLocale(profile.locale) ? profile.locale : lang;

  const joined = new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(user.created_at));

  const role = profile?.role === "admin" ? copy.identity.role.admin : copy.identity.role.client;
  const meta = `${role} · ${fill(copy.identity.joined, { date: joined })}`;

  return (
    <AppShell lang={lang} isAdmin={profile?.role === "admin"} width="narrow">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-ink-50 sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">{copy.subtitle}</p>
      </header>

      <div className="mt-6 flex flex-col gap-3.5">
        <PreferencesForm
          lang={lang}
          units={units}
          locale={savedLocale}
          emailNotifications={emailNotifications}
          copy={copy}
        />

        <ProfileForm
          fullName={profile?.full_name ?? null}
          email={user.email ?? null}
          emailConfirmed={Boolean(user.email_confirmed_at)}
          meta={meta}
          copy={copy}
        />

        <PasswordForm lang={lang} copy={copy} />

        <Surface tone="bare" className="flex flex-col gap-3 p-5 sm:p-6">
          <div>
            <h2 className="text-[15px] font-semibold text-ink-100">
              {copy.signOut.title}
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-400">
              {copy.signOut.body}
            </p>
          </div>

          <form action={signOutAction}>
            <input type="hidden" name="lang" value={lang} />
            <Button type="submit" variant="ghost" size="md">
              <LogOut className="size-4" />
              {copy.signOut.action}
            </Button>
          </form>
        </Surface>
      </div>
    </AppShell>
  );
}
