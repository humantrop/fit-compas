import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { ClientsCopy } from "./types";

const COPY: Record<Locale, ClientsCopy> = { sr, en, ru };

export function getClientsCopy(locale: Locale): ClientsCopy {
  return COPY[locale];
}

export { fill, plural } from "./types";
export type { ClientsCopy, Plural } from "./types";
