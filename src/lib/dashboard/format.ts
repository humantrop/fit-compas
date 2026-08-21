import type { DashboardCopy } from "./copy";

/**
 * Number formatting for the stat tiles.
 *
 * Units are chosen by magnitude rather than fixed, because both ends of the
 * range are real: a first week is 340 kg and a serious year is 180 tonnes, and
 * one unit that fits both makes one of them unreadable. Locale-aware
 * throughout — Serbian and Russian use a comma for the decimal separator, and
 * a hardcoded `toFixed(1)` prints the wrong number in two of three languages.
 */

export function formatVolume(
  kg: number,
  localeTag: string,
  copy: DashboardCopy["stats"],
): string {
  if (kg >= 1000) {
    const tonnes = new Intl.NumberFormat(localeTag, {
      maximumFractionDigits: 1,
    }).format(kg / 1000);
    return `${tonnes} ${copy.tonnes}`;
  }

  const value = new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 0,
  }).format(kg);
  return `${value} ${copy.kg}`;
}

/** "4 h 20 min" past an hour, "35 min" below it. */
export function formatDuration(
  seconds: number,
  copy: DashboardCopy["stats"],
): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} ${copy.minutes}`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${hours} ${copy.hours}`
    : `${hours} ${copy.hours} ${rest} ${copy.minutes}`;
}

export function formatCount(value: number, localeTag: string): string {
  return new Intl.NumberFormat(localeTag).format(value);
}

/** Which greeting to use, by the hour in the reader's own zone. */
export function greetingFor(
  now: Date,
  timeZone: string,
  copy: DashboardCopy["greeting"],
): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );

  if (hour < 11) return copy.morning;
  if (hour < 18) return copy.afternoon;
  return copy.evening;
}
