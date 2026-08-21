import "server-only";

import type { Locale } from "./config";

/**
 * The exercise admin keeps its copy in its own dictionary files, the same way
 * `lib/runner/dictionary.ts` does.
 *
 * Several roadmap features are being built against this repo at once, and the
 * app's three dictionaries are one file per locale — every feature appending a
 * top-level key to the same three files. Two sessions rewriting sr.json from
 * their own stale read loses one set of keys silently, in one language, which
 * is exactly what nobody notices until a user reports it.
 *
 * Same JSON shape, own folder, no shared file touched. Folding these back into
 * `dictionaries/{locale}.json` under an `exercises` key is a copy-paste plus
 * deleting this module, worth doing once the parallel features have landed.
 *
 * The functions keep the code-split of the main loader: a static import map so
 * the bundler can split each locale, rather than one chunk carrying all three.
 */
const dictionaries = {
  sr: () => import("@/dictionaries/exercises/sr.json").then((m) => m.default),
  en: () => import("@/dictionaries/exercises/en.json").then((m) => m.default),
  ru: () => import("@/dictionaries/exercises/ru.json").then((m) => m.default),
} as const;

export type ExercisesDictionary = Awaited<ReturnType<(typeof dictionaries)["sr"]>>;

/**
 * Compile-time replacement for scripts/check-dictionaries.mjs.
 *
 * A key present in sr.json and missing from ru.json renders as `undefined` on
 * a live page, in one language — the kind of thing nobody notices until a user
 * reports it. Assigning the map to this type makes `next build` refuse instead.
 */
const _sameShape: Record<Locale, () => Promise<ExercisesDictionary>> = dictionaries;
void _sameShape;

export async function getExercisesDictionary(
  locale: Locale,
): Promise<ExercisesDictionary> {
  return dictionaries[locale]();
}
