import type { metricKind } from "@/db/schema/enums";
import type { TaxonomyKey } from "@/db/schema/taxonomy";

/**
 * Which vocabularies the Configuration screen edits, and what makes each one
 * different from the plain slug + name + position shape.
 *
 * Type-only imports on purpose: this module is pulled into client components
 * for the URL mapping, and a value import from `@/db/schema` would drag
 * Drizzle into the browser bundle.
 */

export type TaxonomyDef = {
  key: TaxonomyKey;
  /** URL segment. Hyphens read better than the table's underscores. */
  slug: string;
  /** One level of nesting, e.g. Back -> Lats. Muscle groups only. */
  hasParent: boolean;
  /** Which numeric inputs the workout builder shows. Equipment only. */
  hasMetrics: boolean;
};

export const TAXONOMIES: readonly TaxonomyDef[] = [
  { key: "equipment", slug: "equipment", hasParent: false, hasMetrics: true },
  { key: "muscle_groups", slug: "muscle-groups", hasParent: true, hasMetrics: false },
  { key: "goals", slug: "goals", hasParent: false, hasMetrics: false },
  { key: "activities", slug: "activities", hasParent: false, hasMetrics: false },
  { key: "health_issues", slug: "health-issues", hasParent: false, hasMetrics: false },
] as const;

export function taxonomyBySlug(slug: string): TaxonomyDef | undefined {
  return TAXONOMIES.find((t) => t.slug === slug);
}

export function taxonomyByKey(key: string): TaxonomyDef | undefined {
  return TAXONOMIES.find((t) => t.key === key);
}

export type MetricKind = (typeof metricKind)["enumValues"][number];

/**
 * Spelled out rather than read from `metricKind.enumValues` so this file stays
 * value-import-free. `satisfies` catches a value removed from the enum; adding
 * one to the enum without adding it here is the case to watch for.
 */
export const METRIC_KINDS = [
  "weight",
  "resistance",
  "level",
  "incline",
  "speed",
  "pace",
  "distance",
  "power",
  "height",
] as const satisfies readonly MetricKind[];
