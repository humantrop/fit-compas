import type { Locale } from "@/lib/i18n/config";

/**
 * Translatable text is stored as jsonb keyed by locale rather than in a
 * side table of translations.
 *
 * The content here is authored by one admin, not crowd-translated, and every
 * read wants every locale-specific field of a row at once. A join table would
 * turn one exercise fetch into a second query plus a pivot for no benefit.
 * The cost is that a locale can be missing, which `translate()` handles.
 */
export type Translated = Partial<Record<Locale, string>>;

/** Falls back through the requested locale, then Serbian, then anything set. */
export function translate(
  value: Translated | null | undefined,
  locale: Locale,
): string {
  if (!value) return "";
  return value[locale] ?? value.sr ?? Object.values(value).find(Boolean) ?? "";
}
