/**
 * What a unit system is, and the two numbers that convert one.
 *
 * This lives under `account/` rather than under `progress/` because units are a
 * property of the *reader*, not of the data. The database holds kilograms and
 * centimetres for everybody; `profiles.units` says what to draw them as, and
 * feature 16 is where that gets set. Every screen that shows a number with a
 * unit on it — the measurement form, the charts, the tonnage tiles — converts
 * on the way out and back on the way in, and all of them read the same
 * constants from here.
 *
 * Pure and import-free on purpose: the same functions run on the server while
 * rendering a chart and again in the browser inside the entry form, and a value
 * that converts differently on the two sides is a bug the reader sees as a
 * flicker.
 *
 * **The rule everywhere: the reader's own units.** A screen shows numbers in
 * the system of whoever is looking at it, including the trainer looking at a
 * client's tonnage. The alternative — one specific person's screen switching to
 * *that* person's system — reads well on a profile page and falls apart on a
 * list, where every row would carry a different unit and no two would compare.
 * One rule, no per-screen exception.
 */

export type UnitSystem = "metric" | "imperial";

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "metric" || value === "imperial";
}

/** Exact by definition since 1959: one pound is 0.453 592 37 kg. */
export const LB_PER_KG = 2.204_622_621_8;
export const CM_PER_INCH = 2.54;

export function toPounds(kg: number): number {
  return kg * LB_PER_KG;
}
