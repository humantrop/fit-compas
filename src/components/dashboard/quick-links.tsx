import { ArrowUpRight, Dumbbell, LibraryBig } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/surface";
import type { DashboardCopy } from "@/lib/dashboard/copy";
import type { Locale } from "@/lib/i18n/config";

/**
 * The two other places in the client area.
 *
 * Duplicates the tab bar on a phone, which is the point on a wide screen: the
 * tab bar is `sm:hidden`, so without these the desktop dashboard is a dead end
 * with nothing but the header links to leave by.
 */
export function QuickLinks({
  lang,
  copy,
}: {
  lang: Locale;
  copy: DashboardCopy["quick"];
}) {
  const links = [
    { href: `/${lang}/workout`, icon: Dumbbell, ...copy.workouts },
    { href: `/${lang}/library`, icon: LibraryBig, ...copy.library },
  ];

  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {links.map((link) => {
        const Icon = link.icon;

        return (
          <Surface
            key={link.href}
            as={Link}
            href={link.href}
            className="group flex items-start gap-3.5 p-5 transition-colors hover:border-white/16 hover:bg-white/8"
          >
            <span className="mt-0.5 rounded-control border border-brand-500/25 bg-brand-500/12 p-2 text-brand-200">
              <Icon className="size-4.5" />
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-1 text-[14px] font-semibold text-ink-50">
                {link.label}
                <ArrowUpRight className="size-3.5 text-ink-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-200" />
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-400">
                {link.body}
              </p>
            </div>
          </Surface>
        );
      })}
    </div>
  );
}
