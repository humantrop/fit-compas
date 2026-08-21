import type { Difficulty, FacetKey, LibraryKind } from "../types";

/**
 * Feature 09 keeps its own copy instead of adding a branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Those three files are edited by every feature at once, so a shared branch is
 * the one guaranteed merge conflict in a repo where several features are being
 * built in parallel. A typed module buys something on top of that: TypeScript
 * rejects a locale that is missing a key, which is a stronger guarantee than
 * `npm run check:i18n` gives the JSON dictionaries — it fails at build time
 * rather than when someone remembers to run the script.
 *
 * Folding this back into the main dictionaries later is a mechanical move.
 */

/**
 * Serbian and Russian need three plural forms where English needs two, so
 * counts cannot be a single string with a number glued in front. Resolved
 * through `Intl.PluralRules`; `{n}` is the placeholder.
 */
export type Plural = {
  one: string;
  few?: string;
  many?: string;
  other: string;
};

export type LibraryCopy = {
  chrome: {
    signOut: string;
    admin: string;
    dashboard: string;
  };
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;

  kinds: Record<LibraryKind, { label: string; description: string }>;
  counts: Record<LibraryKind, Plural>;

  pending: {
    badge: string;
    title: string;
    body: string;
  };

  filters: {
    heading: string;
    open: string;
    close: string;
    clear: string;
    clearOne: string;
    searchLabel: string;
    searchPlaceholder: string;
    groups: Record<FacetKey, string>;
    showAll: Plural;
    showLess: string;
    sortLabel: string;
    sorts: { newest: string; title: string; difficulty: string };
  };

  difficulty: Record<Difficulty, string>;

  card: {
    video: string;
    noVideo: string;
    reps: string;
    time: string;
    unilateral: string;
    more: Plural;
  };

  detail: {
    back: string;
    cues: string;
    about: string;
    equipment: string;
    muscles: string;
    goals: string;
    activities: string;
    videoPending: string;
    notFound: string;
  };

  empty: {
    filteredTitle: string;
    filteredBody: string;
    emptyTitle: string;
    emptyBody: string;
  };

  locked: {
    title: string;
    body: string;
    action: string;
  };

  pager: {
    previous: string;
    next: string;
    /** "{page} / {pages}" */
    position: string;
  };
};

/**
 * Picks the right plural form for a count. `few` and `many` fall back to
 * `other`, which is what English uses for everything but one.
 */
export function plural(plurals: Plural, n: number, localeTag: string): string {
  const category = new Intl.PluralRules(localeTag).select(n);

  const form =
    category === "one"
      ? plurals.one
      : category === "few"
        ? (plurals.few ?? plurals.other)
        : category === "many"
          ? (plurals.many ?? plurals.few ?? plurals.other)
          : plurals.other;

  return form.replace("{n}", new Intl.NumberFormat(localeTag).format(n));
}
