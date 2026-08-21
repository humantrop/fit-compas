import type { Locale } from "@/lib/i18n/config";

import { en } from "./en";
import { ru } from "./ru";
import { sr } from "./sr";
import type { NotificationsCopy } from "./types";

const COPY: Record<Locale, NotificationsCopy> = { sr, en, ru };

export function getNotificationsCopy(locale: Locale): NotificationsCopy {
  return COPY[locale];
}

export { fill, plural } from "./types";
export type { NotificationsCopy, Plural, WhenChoice } from "./types";
