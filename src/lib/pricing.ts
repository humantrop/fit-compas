/**
 * Placeholder pricing for the marketing page.
 *
 * These become Polar product/price lookups in step 9 — the shape here matches
 * what a Polar product returns so swapping the source does not touch the UI.
 * Amounts are in minor units to avoid float rounding.
 */
export type PlanId = "self" | "coached";

export type Plan = {
  id: PlanId;
  monthly: number;
  yearly: number;
  currency: "EUR";
  popular: boolean;
};

export const plans: Plan[] = [
  { id: "self", monthly: 990, yearly: 9900, currency: "EUR", popular: false },
  { id: "coached", monthly: 2990, yearly: 29900, currency: "EUR", popular: true },
];

export function formatPrice(minor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}
