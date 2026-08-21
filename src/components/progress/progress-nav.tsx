import Link from "next/link";

import type { ProgressCopy } from "@/lib/progress/copy";
import { cn } from "@/lib/utils";

export type ProgressSection = "overview" | "measurements" | "photos";

/**
 * The three screens under Progress.
 *
 * Plain links and a `current` prop rather than `usePathname`, so this stays on
 * the server: each page already knows which one it is, and a client component
 * here would pull the whole sub-nav into the bundle to re-derive a fact the
 * server had for free. The library's shelf tabs are the same shape.
 */
export function ProgressNav({
  lang,
  current,
  copy,
}: {
  lang: string;
  current: ProgressSection;
  copy: ProgressCopy;
}) {
  const items: { key: ProgressSection; href: string }[] = [
    { key: "overview", href: `/${lang}/progress` },
    { key: "measurements", href: `/${lang}/progress/measurements` },
    { key: "photos", href: `/${lang}/progress/photos` },
  ];

  return (
    <nav
      aria-label={copy.title}
      className="flex gap-1 overflow-x-auto rounded-control border border-white/8 bg-white/3 p-1"
    >
      {items.map((item) => {
        const active = item.key === current;

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 items-center rounded-lg px-4",
              "text-[14px] font-semibold whitespace-nowrap transition-colors",
              active
                ? "bg-white/8 text-ink-50"
                : "text-ink-400 hover:bg-white/5 hover:text-ink-100",
            )}
          >
            {copy.nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
