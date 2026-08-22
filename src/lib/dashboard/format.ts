import { toPounds, type UnitSystem } from "@/lib/account/units";

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

/**
 * Tonnage, in the reader's own system (feature 16).
 *
 * The tonne exists in the metric branch because 180 000 kg is a wall of digits
 * and "180 t" is a sentence. The imperial branch has no equivalent partner and
 * deliberately does not invent one: a short ton is not a unit anybody racks,
 * and "198 tn" would be a number the reader has to convert back before it means
 * anything. Pounds all the way up, leaning on digit grouping — which
 * `Intl.NumberFormat` already gets right per locale.
 *
 * The conversion happens before the magnitude test, not after, for the same
 * reason the charts convert before scaling: dividing kilograms and then
 * relabelling the result would print a number in one unit under the symbol of
 * another.
 */
export function formatVolume(
  kg: number,
  localeTag: string,
  copy: DashboardCopy["stats"],
  units: UnitSystem,
): string {
  if (units === "imperial") {
    const pounds = new Intl.NumberFormat(localeTag, {
      maximumFractionDigits: 0,
    }).format(toPounds(kg));
    return `${pounds} ${copy.lb}`;
  }

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
