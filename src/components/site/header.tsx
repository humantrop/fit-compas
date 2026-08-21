"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type NavCopy = {
  features: string;
  how: string;
  pricing: string;
  login: string;
  signup: string;
  openMenu: string;
  closeMenu: string;
};

export function SiteHeader({ lang, nav }: { lang: Locale; nav: NavCopy }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the body while the mobile sheet is open, otherwise iOS scrolls behind it.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const links = [
    { href: `/${lang}#features`, label: nav.features },
    { href: `/${lang}#how`, label: nav.how },
    { href: `/${lang}#pricing`, label: nav.pricing },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 pt-safe transition-colors duration-300",
        scrolled
          ? "border-b border-white/8 bg-base-950/80 backdrop-blur-xl"
          : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={`/${lang}`} aria-label="Fit Compas">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-control px-3.5 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:bg-white/6 hover:text-ink-100"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LocaleSwitcher current={lang} />

          <Link
            href={`/${lang}/login`}
            className="hidden rounded-control px-3.5 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:bg-white/6 hover:text-ink-100 sm:block"
          >
            {nav.login}
          </Link>

          <ButtonLink
            href={`/${lang}/signup`}
            size="sm"
            className="hidden sm:inline-flex"
          >
            {nav.signup}
          </ButtonLink>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? nav.closeMenu : nav.openMenu}
            aria-expanded={menuOpen}
            className="inline-flex size-11 items-center justify-center rounded-control text-ink-200 transition-colors hover:bg-white/6 md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 border-t border-white/8 bg-base-950/95 backdrop-blur-2xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-control px-4 py-4 text-base font-medium text-ink-200 transition-colors hover:bg-white/6"
              >
                {link.label}
              </Link>
            ))}

            <div className="mt-4 flex flex-col gap-3 border-t border-white/8 pt-6">
              <ButtonLink
                href={`/${lang}/login`}
                variant="secondary"
                size="lg"
                onClick={() => setMenuOpen(false)}
              >
                {nav.login}
              </ButtonLink>
              <ButtonLink
                href={`/${lang}/signup`}
                size="lg"
                onClick={() => setMenuOpen(false)}
              >
                {nav.signup}
              </ButtonLink>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
