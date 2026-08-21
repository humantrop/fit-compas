import Link from "next/link";

import { Logo } from "@/components/site/logo";
import type { Locale } from "@/lib/i18n/config";

type FooterCopy = {
  tagline: string;
  product: string;
  company: string;
  legal: string;
  terms: string;
  privacy: string;
  contact: string;
  about: string;
  rights: string;
};

type NavCopy = { features: string; how: string; pricing: string };

export function SiteFooter({
  lang,
  copy,
  nav,
}: {
  lang: Locale;
  copy: FooterCopy;
  nav: NavCopy;
}) {
  const columns = [
    {
      title: copy.product,
      links: [
        { href: `/${lang}#features`, label: nav.features },
        { href: `/${lang}#how`, label: nav.how },
        { href: `/${lang}#pricing`, label: nav.pricing },
      ],
    },
    {
      title: copy.company,
      links: [
        { href: `/${lang}/about`, label: copy.about },
        { href: `/${lang}/contact`, label: copy.contact },
      ],
    },
    {
      title: copy.legal,
      links: [
        { href: `/${lang}/terms`, label: copy.terms },
        { href: `/${lang}/privacy`, label: copy.privacy },
      ],
    },
  ];

  return (
    <footer className="mt-24 border-t border-white/8 pb-safe">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-400">
            {copy.tagline}
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-1">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="-mx-2 inline-block rounded px-2 py-2 text-sm text-ink-300 transition-colors hover:text-ink-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-6xl border-t border-white/6 px-4 py-6 sm:px-6">
        <p className="text-xs text-ink-500">
          &copy; {new Date().getFullYear()} Fit Compas. {copy.rights}
        </p>
      </div>
    </footer>
  );
}
