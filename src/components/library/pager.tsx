import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import type { LibraryCopy } from "@/lib/library/copy";
import { libraryQueryToString, pageCount, type LibraryQuery } from "@/lib/library/filters";
import { cn } from "@/lib/utils";

/**
 * Plain links, not buttons.
 *
 * Page two of a filtered library is a real URL — it can be shared, opened in a
 * new tab and prefetched, none of which a click handler gives you.
 */
export function Pager({
  basePath,
  query,
  total,
  pageSize,
  copy,
  localeTag,
}: {
  basePath: string;
  query: LibraryQuery;
  total: number;
  pageSize: number;
  copy: LibraryCopy;
  localeTag: string;
}) {
  const pages = pageCount(total, pageSize);
  if (pages <= 1) return null;

  const format = new Intl.NumberFormat(localeTag);
  const href = (page: number) =>
    `${basePath}${libraryQueryToString({ ...query, page })}`;

  const step =
    "inline-flex h-11 items-center gap-1.5 rounded-control border px-4 text-[13px] font-semibold transition-colors";
  const enabled = "border-white/10 bg-white/4 text-ink-200 hover:border-white/18 hover:text-ink-50";
  const disabled = "pointer-events-none border-white/6 text-ink-500 opacity-50";

  return (
    <nav className="flex items-center justify-between gap-4">
      <Link
        href={href(query.page - 1)}
        aria-disabled={query.page <= 1}
        tabIndex={query.page <= 1 ? -1 : undefined}
        className={cn(step, query.page <= 1 ? disabled : enabled)}
      >
        <ChevronLeft className="size-4" />
        {copy.pager.previous}
      </Link>

      <span className="font-mono text-[13px] text-ink-400">
        {copy.pager.position
          .replace("{page}", format.format(query.page))
          .replace("{pages}", format.format(pages))}
      </span>

      <Link
        href={href(query.page + 1)}
        aria-disabled={query.page >= pages}
        tabIndex={query.page >= pages ? -1 : undefined}
        className={cn(step, query.page >= pages ? disabled : enabled)}
      >
        {copy.pager.next}
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
