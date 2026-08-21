import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { LibraryCopy } from "./types";

const COPY: Record<Locale, LibraryCopy> = { sr, en, ru };

export function getLibraryCopy(locale: Locale): LibraryCopy {
  return COPY[locale];
}

export { plural } from "./types";
export type { LibraryCopy, Plural } from "./types";
