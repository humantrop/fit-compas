import type { BodyMetric } from "@/db/schema/progress";
import { CM_PER_INCH, LB_PER_KG, type UnitSystem } from "@/lib/account/units";

/**
 * What each body metric is, in one place.
 *
 * The database stores a metric as an enum label and a number in canonical
 * units. Everything else about it — which unit that number is in, what a
 * plausible value looks like, what order the metrics read in — is here, and
 * only here. That is what makes the measurement screen a loop over a list
 * rather than eleven near-identical blocks, and what makes adding a twelfth
 * metric an entry in this file plus one `alter type` in a migration.
 *
 * Pure, no imports beyond the enum type: the same functions format a value on
 * the server for the chart and again in the browser inside the entry form, and
 * a value that formats differently on the two sides is a bug the reader sees
 * as a flicker.
 *
 * **Canonical units are metric.** Kilograms, centimetres, percent. A column
 * that sometimes holds pounds is a column nobody can chart, so the conversion
 * happens at the edge — on the way to the screen and on the way back from the
 * form — and `profiles.units` decides which edge. Feature 16 built the switch
 * for it; nothing in the database moves when the reader flips it.
 */

/**
 * Re-exported rather than declared: the type and the conversion factors moved
 * to `lib/account/units.ts` with feature 16, because the tonnage tiles on the
 * dashboard and the trainer's client screen need them too and none of those
 * has anything to do with body measurements. Every existing import of
 * `UnitSystem` from this module keeps working.
 */
export type { UnitSystem };

/** What kind of quantity a metric is, which is what decides its conversion. */
export type Quantity = "mass" | "length" | "percent";

export type MetricDef = {
  key: BodyMetric;
  quantity: Quantity;
  /**
   * The range a real measurement falls in, in canonical units.
   *
   * Wide on purpose. This is not a health opinion — it exists to catch the
   * person who typed their weight in grams or their waist in metres, and the
   * error message says the bounds out loud rather than just refusing.
   */
  min: number;
  max: number;
};

/**
 * Reading order: the scale first, then down the body.
 *
 * Typed as `BodyMetric[]` so it cannot drift from the database enum — drop a
 * value from `db/schema/progress.ts` without dropping it here and the build
 * fails, which is the only cheap way to keep two lists honest.
 */
export const METRIC_ORDER: BodyMetric[] = [
  "weight",
  "body_fat",
  "neck",
  "shoulders",
  "chest",
  "upper_arm",
  "forearm",
  "waist",
  "hips",
  "thigh",
  "calf",
];

export const METRICS: Record<BodyMetric, MetricDef> = {
  weight: { key: "weight", quantity: "mass", min: 25, max: 350 },
  body_fat: { key: "body_fat", quantity: "percent", min: 2, max: 70 },
  neck: { key: "neck", quantity: "length", min: 20, max: 80 },
  shoulders: { key: "shoulders", quantity: "length", min: 60, max: 200 },
  chest: { key: "chest", quantity: "length", min: 50, max: 200 },
  upper_arm: { key: "upper_arm", quantity: "length", min: 15, max: 80 },
  forearm: { key: "forearm", quantity: "length", min: 12, max: 60 },
  waist: { key: "waist", quantity: "length", min: 40, max: 200 },
  hips: { key: "hips", quantity: "length", min: 50, max: 220 },
  thigh: { key: "thigh", quantity: "length", min: 25, max: 110 },
  calf: { key: "calf", quantity: "length", min: 20, max: 80 },
};

export function isBodyMetric(value: unknown): value is BodyMetric {
  return typeof value === "string" && value in METRICS;
}

/* ------------------------------------------------------------ conversion */

/** The symbol shown after a number, for the reader's own unit system. */
export function unitSymbol(quantity: Quantity, units: UnitSystem): string {
  if (quantity === "percent") return "%";
  if (quantity === "mass") return units === "imperial" ? "lb" : "kg";
  return units === "imperial" ? "in" : "cm";
}

/**
 * Canonical value -> what the reader should see.
 *
 * Rounded to one decimal, which is finer than any tape measure and than every
 * bathroom scale worth the name. The rounding is what makes the round trip
 * survivable: 180.5 lb becomes 81.88 kg becomes 180.5 lb again, where an
 * unrounded trip would land on 180.51 and the reader would watch their own
 * number drift every time they opened the form.
 */
export function toDisplay(value: number, quantity: Quantity, units: UnitSystem): number {
  if (units === "metric" || quantity === "percent") return round(value, 1);
  return round(quantity === "mass" ? value * LB_PER_KG : value / CM_PER_INCH, 1);
}

/** What the reader typed -> what goes in the column. */
export function toCanonical(value: number, quantity: Quantity, units: UnitSystem): number {
  if (units === "metric" || quantity === "percent") return round(value, 2);
  return round(quantity === "mass" ? value / LB_PER_KG : value * CM_PER_INCH, 2);
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/* ------------------------------------------------------------- formatting */

/**
 * A measurement as the reader sees it: "82.4 kg", "34.5 in", "18 %".
 *
 * `Intl.NumberFormat` rather than `toFixed`: Serbian and Russian both write
 * the decimal separator as a comma, and a screen full of "82.4" under Serbian
 * copy is one of the small things that makes an app read as translated.
 */
export function formatMeasurement(
  value: number,
  metric: BodyMetric,
  units: UnitSystem,
  localeTag: string,
): string {
  const def = METRICS[metric];
  const shown = toDisplay(value, def.quantity, units);

  return `${new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 1,
  }).format(shown)} ${unitSymbol(def.quantity, units)}`;
}

/**
 * A change, always signed: "+1.2 kg", "−3.5 cm".
 *
 * Signed and never coloured, because the app does not know which way is
 * progress. A rising waist is a bulk going well or a cut going badly, and
 * exactly the same number means the opposite thing to the person next to them.
 * The screen states the change; the reader knows what they were aiming at.
 * The minus is U+2212, not a hyphen — a hyphen next to a digit is a dash.
 */
export function formatDelta(
  delta: number,
  metric: BodyMetric,
  units: UnitSystem,
  localeTag: string,
): string {
  const def = METRICS[metric];
  const shown = toDisplay(Math.abs(delta), def.quantity, units);
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";

  return `${sign}${new Intl.NumberFormat(localeTag, {
    maximumFractionDigits: 1,
  }).format(shown)} ${unitSymbol(def.quantity, units)}`;
}

/**
 * The bounds of the entry field, in the unit the field is labelled with.
 *
 * Derived from the canonical range rather than written twice: a second table
 * of imperial limits would be the same numbers with a conversion baked in, and
 * the first time somebody widened one range they would widen one of them.
 */
export function displayRange(
  metric: BodyMetric,
  units: UnitSystem,
): { min: number; max: number } {
  const def = METRICS[metric];
  return {
    min: toDisplay(def.min, def.quantity, units),
    max: toDisplay(def.max, def.quantity, units),
  };
}

/** Whether a canonical value is a measurement of a person and not a typo. */
export function inRange(value: number, metric: BodyMetric): boolean {
  const def = METRICS[metric];
  return Number.isFinite(value) && value >= def.min && value <= def.max;
}

/**
 * Reads a number out of a form field.
 *
 * Accepts a comma as the decimal separator: the form is labelled in Serbian
 * and Russian, both of which write 82,4, and a phone keyboard under those
 * locales offers a comma. Refusing it would be the app insisting on English
 * punctuation for a number the reader typed correctly.
 */
export function parseDecimal(raw: unknown): number | null {
  if (typeof raw !== "string") return null;

  const cleaned = raw.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
