import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { ProgressCopy } from "./types";

const COPY: Record<Locale, ProgressCopy> = { sr, en, ru };

export function getProgressCopy(locale: Locale): ProgressCopy {
  return COPY[locale];
}

export { fill, plural } from "./types";
export type { Plural, ProgressCopy } from "./types";
