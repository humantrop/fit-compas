import { LogOut, Shield, UserRound } from "lucide-react";

import { AppNavLinks, AppTabBar } from "@/components/app/app-nav";
import { TimezoneProbe } from "@/components/app/timezone-probe";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { getAccountCopy } from "@/lib/account/copy";
import { signOutAction } from "@/lib/auth/actions";
import { getDashboardCopy } from "@/lib/dashboard/copy";
import type { Locale } from "@/lib/i18n/config";
import { getNotificationsCopy } from "@/lib/notifications/copy";
import { cn } from "@/lib/utils";

/**
 * The client area's chrome — the real one.
 *
 * Features 09 and 10 shipped before this existed and each re-stated the header
 * in a component of its own (`LibraryChrome`, `RunnerShell`), on purpose: two
 * features editing one layout file at the same time is how one of them quietly
 * loses its header. Both left a note saying feature 11 replaces them, and this
 * is that replacement — both files are gone and their pages wrap in this.
 *
 * Still a component rather than a route-group `layout.tsx`. A layout would
 * force the runner to have a tab bar underneath it, and the runner is the one
 * screen that must not: it is a full-screen thing you hold at arm's length
 * between sets, and a nav bar there is a mis-tap that abandons a workout.
 * `tabs={false}` is the runner, and a component makes that a prop instead of a
 * second route group.
 */
export function AppShell({
  lang,
  isAdmin = false,
  width = "wide",
  tabs = true,
  children,
}: {
  lang: Locale;
  isAdmin?: boolean;
  /** `narrow` is the reading width for a single column — the runner, a form. */
  width?: "narrow" | "wide";
  tabs?: boolean;
  children: React.ReactNode;
}) {
  const copy = getDashboardCopy(lang).chrome;
  const accountLabel = getAccountCopy(lang).nav;

  return (
    <div className="flex min-h-dvh flex-col">
      <TimezoneProbe />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-base-950/70 px-4 pt-safe backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-5 py-3.5">
          <Logo />
          {tabs ? (
            <AppNavLinks
              lang={lang}
              labels={copy.tabs}
              className="hidden sm:flex"
            />
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Feature 15. In the header on every screen including the runner:
              the tab bar is already five items wide and the one place a
              notification must never be is behind a menu. */}
          <NotificationBell
            lang={lang}
            label={getNotificationsCopy(lang).inbox.bell}
          />

          {isAdmin ? (
            <ButtonLink href={`/${lang}/admin`} variant="secondary" size="sm">
              <Shield className="size-4" />
              <span className="hidden sm:inline">{copy.admin}</span>
            </ButtonLink>
          ) : null}

          <LocaleSwitcher current={lang} />

          {/* Feature 16. In the header rather than as a sixth tab: the tab bar
              is the five things somebody opens the app to do, and settings is
              not one of them — it is the thing they go looking for twice a
              year. */}
          <ButtonLink
            href={`/${lang}/account`}
            variant="ghost"
            size="sm"
            aria-label={accountLabel}
          >
            <UserRound className="size-4" />
          </ButtonLink>

          <form action={signOutAction}>
            <input type="hidden" name="lang" value={lang} />
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              <span className="sr-only">{copy.signOut}</span>
            </Button>
          </form>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-8 sm:px-6",
          width === "narrow" ? "max-w-2xl" : "max-w-6xl",
          // The tab bar is fixed and only exists below `sm`, so the room it
          // needs is reserved on the same breakpoint.
          tabs ? "pb-tabbar sm:py-10 sm:pb-10" : "pb-safe",
        )}
      >
        {children}
      </main>

      {tabs ? <AppTabBar lang={lang} labels={copy.tabs} /> : null}
    </div>
  );
}
