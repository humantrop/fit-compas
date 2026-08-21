"use client";

import {
  Bell,
  CalendarRange,
  Dumbbell,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/auth/actions";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export type AdminNavCopy = {
  overview: string;
  exercises: string;
  workouts: string;
  programs: string;
  clients: string;
  notifications: string;
  configuration: string;
  groupContent: string;
  groupPeople: string;
  groupSystem: string;
  backToApp: string;
  signOut: string;
  openMenu: string;
  closeMenu: string;
  soon: string;
  badge: string;
};

type Item = {
  key: keyof AdminNavCopy;
  path: string;
  icon: typeof LayoutGrid;
  /** Built in a later feature — shown, but not linked. */
  soon?: boolean;
};

/**
 * The whole admin surface, listed from the first screen rather than grown one
 * item at a time. Seeing what is coming — and that it is deliberately not
 * clickable yet — beats a menu that silently gains entries every week.
 */
const GROUPS: { label: keyof AdminNavCopy | null; items: Item[] }[] = [
  {
    label: null,
    items: [{ key: "overview", path: "", icon: LayoutGrid }],
  },
  {
    label: "groupContent",
    items: [
      { key: "exercises", path: "/exercises", icon: Dumbbell },
      { key: "workouts", path: "/workouts", icon: ListChecks, soon: true },
      { key: "programs", path: "/programs", icon: CalendarRange },
    ],
  },
  {
    label: "groupPeople",
    items: [
      { key: "clients", path: "/clients", icon: Users, soon: true },
      { key: "notifications", path: "/notifications", icon: Bell, soon: true },
    ],
  },
  {
    label: "groupSystem",
    items: [
      { key: "configuration", path: "/configuration", icon: SlidersHorizontal },
    ],
  },
];

export function AdminShell({
  lang,
  copy,
  children,
}: {
  lang: Locale;
  copy: AdminNavCopy;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const root = `/${lang}/admin`;

  function isActive(path: string): boolean {
    const href = `${root}${path}`;
    return path === "" ? pathname === href : pathname.startsWith(href);
  }

  const nav = (
    <nav className="flex flex-col gap-6">
      {GROUPS.map((group, index) => (
        <div key={group.label ?? `group-${index}`} className="flex flex-col gap-1">
          {group.label ? (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
              {copy[group.label]}
            </p>
          ) : null}

          {group.items.map((item) => {
            const Icon = item.icon;
            const label = copy[item.key];
            const classes =
              "flex h-11 items-center gap-3 rounded-control px-3 text-[14px] font-medium transition-colors";

            if (item.soon) {
              return (
                <span
                  key={item.key}
                  aria-disabled
                  className={cn(classes, "cursor-default text-ink-500")}
                >
                  <Icon className="size-4.5 shrink-0" />
                  <span className="truncate">{label}</span>
                  <span className="ml-auto rounded-full border border-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    {copy.soon}
                  </span>
                </span>
              );
            }

            const active = isActive(item.path);

            return (
              <Link
                key={item.key}
                href={`${root}${item.path}`}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  classes,
                  active
                    ? "border border-brand-500/25 bg-brand-500/12 text-brand-100"
                    : "border border-transparent text-ink-300 hover:bg-white/6 hover:text-ink-100",
                )}
              >
                <Icon className="size-4.5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col gap-7 p-4">
      <div className="flex items-center gap-2.5 px-1 pt-1">
        <Link href={`/${lang}`} aria-label="Fit Compas">
          <Logo />
        </Link>
        <span className="rounded-full border border-brand-500/25 bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-200">
          {copy.badge}
        </span>
      </div>

      {nav}

      <Link
        href={`/${lang}/dashboard`}
        onClick={() => setMenuOpen(false)}
        className="mt-auto flex h-11 items-center gap-3 rounded-control px-3 text-[13px] font-medium text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
      >
        <LayoutGrid className="size-4 shrink-0" />
        {copy.backToApp}
      </Link>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-[264px]">
      {/* Desktop rail. Fixed so long lists scroll under it without dragging
          the nav along. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] border-r border-white/8 bg-base-950/70 backdrop-blur-xl pt-safe lg:block">
        {sidebarBody}
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/8 bg-base-950/80 backdrop-blur-xl pt-safe">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={copy.openMenu}
              className="inline-flex size-11 items-center justify-center rounded-control text-ink-200 transition-colors hover:bg-white/6"
            >
              <Menu className="size-5" />
            </button>
            <Logo />
          </div>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-1.5">
            <LocaleSwitcher current={lang} />
            <form action={signOutAction}>
              <input type="hidden" name="lang" value={lang} />
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">{copy.signOut}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-void/70 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[276px] max-w-[86vw] border-r border-white/10 bg-base-950/95 backdrop-blur-2xl pt-safe">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={copy.closeMenu}
              className="absolute right-2 top-[calc(var(--sat)+0.75rem)] inline-flex size-11 items-center justify-center rounded-control text-ink-300 transition-colors hover:bg-white/6"
            >
              <X className="size-5" />
            </button>
            {sidebarBody}
          </div>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-5xl px-4 py-8 pb-safe sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
