import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import type { Locale } from "@/lib/i18n/config";

/**
 * Chrome for the two runner screens.
 *
 * Deliberately not a route-group `layout.tsx`: the client area is going to get
 * a real shell with a tab bar in feature 11, and two features editing the same
 * layout file at the same time is how one of them quietly loses its header.
 * This is a plain component — feature 11 deletes it and wraps the pages in the
 * real thing.
 *
 * `pb-tabbar` is the room that bottom bar will need; leaving it out now means
 * the last button of every workout ends up under it later.
 */
export function RunnerShell({
  lang,
  children,
}: {
  lang: Locale;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-white/8 px-4 pt-safe sm:px-6">
        <div className="py-4">
          <Logo />
        </div>
        <LocaleSwitcher current={lang} />
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8 pb-tabbar sm:px-6">
        {children}
      </main>
    </div>
  );
}
