export const locales = ["sr", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sr";

export const localeNames: Record<Locale, string> = {
  sr: "Srpski",
  en: "English",
  ru: "Русский",
};

/** Short label for the compact switcher in the header. */
export const localeShort: Record<Locale, string> = {
  sr: "SR",
  en: "EN",
  ru: "RU",
};

/**
 * BCP 47 tags for <html lang> and Intl formatters.
 *
 * Serbian carries its script: bare `sr-RS` resolves to Cyrillic in ICU, so
 * every `Intl.DateTimeFormat` in the app printed "петак, 21. август" under a
 * UI written entirely in Latin. Numbers and plural rules are identical between
 * the two — only the script changes.
 */
export const localeTags: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  en: "en-US",
  ru: "ru-RU",
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
