/**
 * Shapes the client library is built on.
 *
 * Everything here is plain data with strings already resolved out of the
 * `Translated` jsonb columns. The filter panel is a client component, so a
 * `Translated` object crossing that boundary would ship all three locales to
 * the browser for every row.
 */

export const LIBRARY_KINDS = ["exercises", "workouts", "programs"] as const;

export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export function isLibraryKind(value: string): value is LibraryKind {
  return (LIBRARY_KINDS as readonly string[]).includes(value);
}

/** Mirrors the `difficulty` enum, in the order Postgres declares it. */
export const DIFFICULTIES = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/** The five dimensions a client can narrow the library by. */
export const FACET_KEYS = [
  "equipment",
  "muscles",
  "goals",
  "activities",
  "difficulty",
] as const;

export type FacetKey = (typeof FACET_KEYS)[number];

export type FacetOption = {
  /** Slugs, not ids: they are stable across renames, so a shared link survives. */
  slug: string;
  label: string;
  /** How many published items carry this term, ignoring the active filters. */
  count: number;
  /** Muscle groups only — lets the panel nest "Lats" under "Back". */
  parentSlug: string | null;
};

export type Facet = {
  key: FacetKey;
  options: FacetOption[];
};

export type LibraryTag = {
  slug: string;
  label: string;
};

/** One card in the grid. */
export type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  difficulty: Difficulty;
  /** Reps or time — shown as a small badge, matches the runner's default. */
  mode: "reps" | "time";
  isUnilateral: boolean;
  hasVideo: boolean;
  durationSec: number | null;
  equipment: LibraryTag[];
  muscles: LibraryTag[];
};

/** The detail screen adds the long-form fields to the card data. */
export type LibraryDetail = LibraryItem & {
  description: string;
  cues: string;
  goals: LibraryTag[];
  activities: LibraryTag[];
};

export type LibraryResult = {
  items: LibraryItem[];
  /** Total matches, not the length of `items` — drives the pager. */
  total: number;
  page: number;
  pageSize: number;
};

export const EMPTY_RESULT: LibraryResult = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 0,
};
