import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { PlanCopy } from "./types";

const COPY: Record<Locale, PlanCopy> = { sr, en, ru };

export function getPlanCopy(locale: Locale): PlanCopy {
  return COPY[locale];
}

export { fill, plural } from "./types";
export type { PlanCopy, Plural } from "./types";
