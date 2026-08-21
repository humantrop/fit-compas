import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { DashboardCopy } from "./types";

const COPY: Record<Locale, DashboardCopy> = { sr, en, ru };

export function getDashboardCopy(locale: Locale): DashboardCopy {
  return COPY[locale];
}

export { fill, plural } from "./types";
export type { DashboardCopy, Plural } from "./types";
