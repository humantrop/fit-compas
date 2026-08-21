import "server-only";

import type { Locale } from "@/lib/i18n/config";

import type { LibraryQuery } from "./filters";
import { exerciseFacets, getExerciseBySlug, searchExercises } from "./queries";
import {
  EMPTY_RESULT,
  type Facet,
  type LibraryDetail,
  type LibraryKind,
  type LibraryResult,
} from "./types";

/**
 * One shelf of the library per content type.
 *
 * The three shelves land in three different features — exercises in 06,
 * workouts in 07, programs in 08 — so the library screen is written against
 * this interface rather than against three sets of tables. Exercises are the
 * only shelf whose tables exist today; the other two declare themselves
 * `pending` and the screen renders a notice instead of an empty grid, which is
 * the honest thing to show a client who has paid for access.
 *
 * Turning one on is a two-line change in this file — swap `pending` for the
 * real `search`/`facets` — and nothing in the pages, the filter panel or the
 * URL contract moves. That is the whole reason the seam is here.
 */
export type LibrarySource = {
  kind: LibraryKind;
  /**
   * `pending` means the tables are not built yet, not that the shelf is empty.
   * The distinction is what the reader sees.
   */
  status: "ready" | "pending";
  search(query: LibraryQuery, locale: Locale): Promise<LibraryResult>;
  facets(locale: Locale): Promise<Facet[]>;
  /** Null for an unknown slug and for anything not published. */
  get(slug: string, locale: Locale): Promise<LibraryDetail | null>;
};

/** A shelf whose feature has not shipped. Answers empty rather than throwing. */
function pending(kind: LibraryKind): LibrarySource {
  return {
    kind,
    status: "pending",
    async search() {
      return { ...EMPTY_RESULT };
    },
    async facets() {
      return [];
    },
    async get() {
      return null;
    },
  };
}

const SOURCES: Record<LibraryKind, LibrarySource> = {
  exercises: {
    kind: "exercises",
    status: "ready",
    search: searchExercises,
    facets: exerciseFacets,
    get: getExerciseBySlug,
  },
  // Roadmap 07 — workout builder.
  workouts: pending("workouts"),
  // Roadmap 08 — multi-week programs.
  programs: pending("programs"),
};

export function librarySource(kind: LibraryKind): LibrarySource {
  return SOURCES[kind];
}

export function libraryShelves(): LibrarySource[] {
  return Object.values(SOURCES);
}
