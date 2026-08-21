import type { Locale } from "@/lib/i18n/config";

import sr from "@/dictionaries/runner/sr.json";
import en from "@/dictionaries/runner/en.json";
import ru from "@/dictionaries/runner/ru.json";

/**
 * The runner's own strings, in their own files.
 *
 * The app's three dictionaries are one file per locale, and several roadmap
 * features are being built against this repo at the same time — every one of
 * them adding a top-level key to the same three files. A whole-file rewrite by
 * two sessions at once loses one of them silently, in one language, which is
 * exactly the failure `scripts/check-dictionaries.mjs` exists to catch and
 * exactly the kind nobody notices.
 *
 * So: same JSON shape, separate folder, no shared file touched. Folding these
 * three files back into `src/dictionaries/*.json` under a `runner` key is a
 * copy-paste plus deleting this module — worth doing once the parallel
 * features have landed.
 *
 * Parity is checked by the compiler instead of by the script: `sr` defines the
 * shape and `en`/`ru` are typed against it, so a missing key fails the build.
 */
export type RunnerDictionary = typeof sr;

const dictionaries: Record<Locale, RunnerDictionary> = { sr, en, ru };

export function getRunnerDictionary(locale: Locale): RunnerDictionary {
  return dictionaries[locale] ?? dictionaries.sr;
}

/**
 * `fill("Round {current}/{total}", { current: 2, total: 3 })`.
 *
 * Serbian, English and Russian put numbers in different places in a sentence,
 * so the strings keep the whole sentence and take placeholders — concatenating
 * fragments in JSX gives you a word order that only works in one of the three.
 */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
