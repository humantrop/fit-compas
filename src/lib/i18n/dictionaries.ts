import "server-only";

import type { Locale } from "./config";

/**
 * Static import map so the bundler can code-split each dictionary. A dynamic
 * `import(`../../dictionaries/${locale}.json`)` would pull all three into the
 * same chunk.
 */
const dictionaries = {
  sr: () => import("@/dictionaries/sr.json").then((m) => m.default),
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  ru: () => import("@/dictionaries/ru.json").then((m) => m.default),
} as const;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["sr"]>>;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
