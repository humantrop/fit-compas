import "server-only";

import { asc, sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import {
  equipment,
  equipmentMetrics,
  muscleGroups,
  taxonomyTables,
  type TaxonomyKey,
} from "@/db/schema/taxonomy";
import type { MetricKind } from "@/lib/taxonomy/config";

/** One row of any vocabulary, flattened for the admin list. */
export type TaxonomyItem = {
  id: string;
  slug: string;
  name: Translated;
  position: number;
  isActive: boolean;
  /** Muscle groups only. */
  parentId: string | null;
  /** Equipment only, in builder order. */
  metrics: MetricKind[];
};

/**
 * The four flat vocabularies are the same table shape, so one cast here saves
 * four identical branches. Muscle groups get their own branch because they
 * carry `parent_id`.
 */
type FlatTable = typeof equipment;

export async function listTaxonomy(key: TaxonomyKey): Promise<TaxonomyItem[]> {
  if (key === "muscle_groups") {
    const rows = await db
      .select()
      .from(muscleGroups)
      .orderBy(asc(muscleGroups.position), asc(muscleGroups.slug));

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      position: row.position,
      isActive: row.isActive,
      parentId: row.parentId,
      metrics: [],
    }));
  }

  const table = taxonomyTables[key] as FlatTable;
  const rows = await db
    .select()
    .from(table)
    .orderBy(asc(table.position), asc(table.slug));

  const metricsById =
    key === "equipment" ? await listEquipmentMetrics() : new Map<string, MetricKind[]>();

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    position: row.position,
    isActive: row.isActive,
    parentId: null,
    metrics: metricsById.get(row.id) ?? [],
  }));
}

async function listEquipmentMetrics(): Promise<Map<string, MetricKind[]>> {
  const rows = await db
    .select({
      equipmentId: equipmentMetrics.equipmentId,
      metric: equipmentMetrics.metric,
    })
    .from(equipmentMetrics)
    .orderBy(asc(equipmentMetrics.equipmentId), asc(equipmentMetrics.position));

  const byId = new Map<string, MetricKind[]>();
  for (const row of rows) {
    const list = byId.get(row.equipmentId);
    if (list) list.push(row.metric);
    else byId.set(row.equipmentId, [row.metric]);
  }
  return byId;
}

export type TaxonomyCount = { total: number; active: number };

/** Feeds the count on each Configuration card. One round trip per vocabulary. */
export async function countTaxonomies(): Promise<Record<TaxonomyKey, TaxonomyCount>> {
  const keys = Object.keys(taxonomyTables) as TaxonomyKey[];

  const results = await Promise.all(
    keys.map(async (key) => {
      const table = taxonomyTables[key] as FlatTable;
      const [row] = await db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`(count(*) filter (where is_active))::int`,
        })
        .from(table);

      return [key, row ?? { total: 0, active: 0 }] as const;
    }),
  );

  return Object.fromEntries(results) as Record<TaxonomyKey, TaxonomyCount>;
}
