"use client";

import { CalendarDays, Dumbbell, House, LibraryBig, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The client area's navigation, in its two shapes.
 *
 * One module because the shapes must never disagree about which tab is
 * current: a bottom bar on the phone and a row of links in the header on a
 * wide screen, both reading the same `usePathname`. This is the only client
 * component in the shell — the header itself stays on the server so the sign
 * out action and the profile lookup do not have to cross the boundary.
 */

export type TabLabels = {
  today: string;
  plan: string;
  workouts: string;
  library: string;
  progress: string;
};

type Item = {
  key: keyof TabLabels;
  href: string;
  icon: typeof House;
  /** `/sr/workout/push-day` still lights up the Workouts tab. */
  prefix: boolean;
};

function items(lang: Locale): Item[] {
  return [
    { key: "today", href: `/${lang}/dashboard`, icon: House, prefix: false },
    { key: "plan", href: `/${lang}/plan`, icon: CalendarDays, prefix: false },
    { key: "workouts", href: `/${lang}/workout`, icon: Dumbbell, prefix: true },
    { key: "library", href: `/${lang}/library`, icon: LibraryBig, prefix: true },
    // Prefix matching: /sr/progress/photos still lights up this tab.
    { key: "progress", href: `/${lang}/progress`, icon: TrendingUp, prefix: true },
  ];
}

/** Href matching, shared so the two shapes can never disagree. */
function useActive() {
  const pathname = usePathname();

  return (item: Item) =>
    item.prefix
      ? pathname === item.href || pathname.startsWith(`${item.href}/`)
      : pathname === item.href;
}

/** The wide-screen version: plain links beside the logo. */
export function AppNavLinks({
  lang,
  labels,
  className,
}: {
  lang: Locale;
  labels: TabLabels;
  className?: string;
}) {
  const isActive = useActive();

  return (
    <nav className={cn("items-center gap-1", className)}>
      {items(lang).map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-2 text-[13px] font-semibold transition-colors",
              active
                ? "bg-white/8 text-ink-50"
                : "text-ink-400 hover:bg-white/5 hover:text-ink-100",
            )}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The phone version: fixed to the bottom, above the home indicator.
 *
 * `pb-safe` here and `pb-tabbar` on the main column are two halves of the same
 * measurement — the bar clears the indicator, the content clears the bar. Both
 * were reserved in `globals.css` from day one because retrofitting them is
 * where notch bugs come from.
 */
export function AppTabBar({
  lang,
  labels,
}: {
  lang: Locale;
  labels: TabLabels;
}) {
  const isActive = useActive();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-base-950/85 pb-safe backdrop-blur-xl sm:hidden">
      <ul className="mx-auto flex max-w-md">
        {items(lang).map((item) => {
          const active = isActive(item);
          const Icon = item.icon;

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  active ? "text-brand-200" : "text-ink-500 hover:text-ink-300",
                )}
              >
                <span className="relative">
                  <Icon className="size-5.5" strokeWidth={active ? 2.4 : 1.9} />
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute -top-2.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-glow shadow-[0_0_10px_rgb(0_212_255/0.8)]"
                    />
                  ) : null}
                </span>
                {labels[item.key]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
