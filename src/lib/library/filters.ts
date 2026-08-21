import {
  DIFFICULTIES,
  FACET_KEYS,
  type Difficulty,
  type FacetKey,
} from "./types";

/**
 * The library's whole UI state lives in the URL.
 *
 * A filtered view is then a link: shareable, bookmarkable, and correct when the
 * back button is pressed. It also keeps the list a server component — the
 * filter panel only rewrites the query string and lets the server re-render.
 *
 * This module is imported by the client panel, so it stays free of `server-only`
 * and of any database import.
 */

export const PAGE_SIZE = 24;

export const SORTS = ["newest", "title", "difficulty"] as const;
export type SortKey = (typeof SORTS)[number];

export type LibraryQuery = {
  q: string;
  equipment: string[];
  muscles: string[];
  goals: string[];
  activities: string[];
  difficulty: Difficulty[];
  sort: SortKey;
  page: number;
};

export const EMPTY_QUERY: LibraryQuery = {
  q: "",
  equipment: [],
  muscles: [],
  goals: [],
  activities: [],
  difficulty: [],
  sort: "newest",
  page: 1,
};

/** URL parameter name per facet. `level` reads better than `difficulty` in a link. */
export const FACET_PARAM: Record<FacetKey, string> = {
  equipment: "equipment",
  muscles: "muscles",
  goals: "goals",
  activities: "activities",
  difficulty: "level",
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/**
 * Comma-separated rather than repeated keys: `?muscles=back,chest` instead of
 * `?muscles=back&muscles=chest`. Shorter, and it survives a copy-paste into a
 * chat window that eats ampersands.
 */
function parseList(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  const seen = new Set<string>();

  for (const part of raw.split(",")) {
    const slug = part.trim().toLowerCase();
    // Slugs only. Anything else is someone editing the URL by hand.
    if (slug && /^[a-z0-9-]+$/.test(slug)) seen.add(slug);
  }

  return [...seen];
}

export function parseLibraryQuery(params: RawParams): LibraryQuery {
  const sortRaw = first(params.sort) as SortKey;
  const pageRaw = Number.parseInt(first(params.page), 10);

  return {
    q: first(params.q).trim().slice(0, 80),
    equipment: parseList(params[FACET_PARAM.equipment]),
    muscles: parseList(params[FACET_PARAM.muscles]),
    goals: parseList(params[FACET_PARAM.goals]),
    activities: parseList(params[FACET_PARAM.activities]),
    difficulty: parseList(params[FACET_PARAM.difficulty]).filter(
      (value): value is Difficulty =>
        (DIFFICULTIES as readonly string[]).includes(value),
    ),
    sort: SORTS.includes(sortRaw) ? sortRaw : "newest",
    page: Number.isFinite(pageRaw) && pageRaw > 1 ? Math.min(pageRaw, 500) : 1,
  };
}

export function selectedFor(query: LibraryQuery, key: FacetKey): string[] {
  return key === "difficulty" ? query.difficulty : query[key];
}

/** Defaults are omitted so an unfiltered library has a clean `/library/exercises`. */
export function libraryQueryToString(query: LibraryQuery): string {
  const params = new URLSearchParams();

  if (query.q) params.set("q", query.q);

  for (const key of FACET_KEYS) {
    const values = selectedFor(query, key);
    if (values.length) params.set(FACET_PARAM[key], values.join(","));
  }

  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));

  const search = params.toString();
  return search ? `?${search}` : "";
}

/** Any change to what is shown has to send the reader back to page one. */
export function withFacet(
  query: LibraryQuery,
  key: FacetKey,
  slug: string,
): LibraryQuery {
  const current = selectedFor(query, key);
  const next = current.includes(slug)
    ? current.filter((value) => value !== slug)
    : [...current, slug];

  return { ...query, [key]: next, page: 1 } as LibraryQuery;
}

export function activeFilterCount(query: LibraryQuery): number {
  return (
    FACET_KEYS.reduce((sum, key) => sum + selectedFor(query, key).length, 0) +
    (query.q ? 1 : 0)
  );
}

export function isFiltered(query: LibraryQuery): boolean {
  return activeFilterCount(query) > 0;
}

export function pageCount(total: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
