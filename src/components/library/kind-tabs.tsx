import Link from "next/link";

import type { LibraryCopy } from "@/lib/library/copy";
import type { LibraryKind } from "@/lib/library/types";
import { cn } from "@/lib/utils";

export type KindTab = {
  kind: LibraryKind;
  status: "ready" | "pending";
};

/**
 * The three shelves, always all three.
 *
 * A pending shelf is shown greyed with a "soon" marker rather than hidden: it
 * tells a client what the library is going to hold, and it means nothing in
 * this component changes when features 07 and 08 land — the shelf flips to
 * `ready` in `lib/library/sources.ts` and the tab becomes a link.
 */
export function KindTabs({
  tabs,
  current,
  lang,
  copy,
}: {
  tabs: KindTab[];
  current: LibraryKind;
  lang: string;
  copy: LibraryCopy;
}) {
  return (
    <nav
      aria-label={copy.title}
      className="flex gap-1 overflow-x-auto rounded-control border border-white/8 bg-white/3 p-1"
    >
      {tabs.map(({ kind, status }) => {
        const active = kind === current;
        const label = copy.kinds[kind].label;

        const shared = cn(
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4",
          "text-[14px] font-semibold whitespace-nowrap transition-colors",
        );

        if (status === "pending") {
          return (
            <span
              key={kind}
              aria-disabled
              className={cn(shared, "cursor-default text-ink-500")}
            >
              {label}
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                {copy.pending.badge}
              </span>
            </span>
          );
        }

        return (
          <Link
            key={kind}
            href={`/${lang}/library/${kind}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              shared,
              active
                ? "bg-brand-500/18 text-brand-100 shadow-[inset_0_0_0_1px_rgb(46_107_255/0.35)]"
                : "text-ink-300 hover:bg-white/6 hover:text-ink-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
