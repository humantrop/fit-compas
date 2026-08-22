import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { AccountCopy } from "./types";

const COPY: Record<Locale, AccountCopy> = { sr, en, ru };

export function getAccountCopy(locale: Locale): AccountCopy {
  return COPY[locale];
}

export { fill } from "./types";
export type { AccountCopy } from "./types";
