import { LayoutDashboard, LogOut, Shield } from "lucide-react";

import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Locale } from "@/lib/i18n/config";
import type { LibraryCopy } from "@/lib/library/copy";

/**
 * The app header for the library screens.
 *
 * Deliberately a copy of the one on the dashboard rather than a shared shell:
 * feature 11 builds the real client shell with its bottom tab bar, and every
 * screen written before it re-states this header instead of half-inventing the
 * shell it is going to replace.
 */
export function LibraryChrome({
  lang,
  isAdmin,
  copy,
  children,
}: {
  lang: Locale;
  isAdmin: boolean;
  copy: LibraryCopy;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-white/8 px-4 pt-safe sm:px-6">
        <div className="py-4">
          <Logo />
        </div>

        <div className="flex items-center gap-1.5">
          <ButtonLink
            href={`/${lang}/dashboard`}
            variant="ghost"
            size="sm"
            className="text-ink-300"
          >
            <LayoutDashboard className="size-4" />
            <span className="hidden sm:inline">{copy.chrome.dashboard}</span>
          </ButtonLink>

          {isAdmin ? (
            <ButtonLink href={`/${lang}/admin`} variant="secondary" size="sm">
              <Shield className="size-4" />
              <span className="hidden sm:inline">{copy.chrome.admin}</span>
            </ButtonLink>
          ) : null}

          <LocaleSwitcher current={lang} />

          <form action={signOutAction}>
            <input type="hidden" name="lang" value={lang} />
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              <span className="sr-only">{copy.chrome.signOut}</span>
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-safe sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
