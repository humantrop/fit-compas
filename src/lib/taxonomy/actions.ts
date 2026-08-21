"use server";

import { asc, eq, isNull, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import {
  equipment,
  equipmentMetrics,
  muscleGroups,
  taxonomyTables,
} from "@/db/schema/taxonomy";
import { getProfile } from "@/lib/auth/session";
import { locales } from "@/lib/i18n/config";
import {
  METRIC_KINDS,
  taxonomyByKey,
  type MetricKind,
  type TaxonomyDef,
} from "@/lib/taxonomy/config";
import { isValidSlug, slugify } from "@/lib/taxonomy/slug";
import type { TaxonomyErrorCode, TaxonomyState } from "@/lib/taxonomy/types";

/** See queries.ts — the four flat vocabularies share one table shape. */
type FlatTable = typeof equipment;

function fail(code: TaxonomyErrorCode): TaxonomyState {
  return { status: "error", code };
}

/**
 * Server Actions are reachable by a direct POST, not only through our UI, so
 * the role check belongs in every one of them. Drizzle connects as `postgres`
 * and bypasses RLS — the database will not catch a missing check here.
 */
async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

/** The taxonomy key arrives from the client, so it is never trusted. */
function resolve(value: unknown): TaxonomyDef | undefined {
  return taxonomyByKey(String(value ?? ""));
}

function tableOf(def: TaxonomyDef): FlatTable {
  return taxonomyTables[def.key] as FlatTable;
}

/** Postgres unique_violation — the slug is already taken. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
}

const nameSchema = z.string().trim().max(80);
const uuidSchema = z.string().uuid();

/** Only locales actually filled in get stored; `translate()` handles the rest. */
function readNames(formData: FormData): Translated | null {
  const names: Translated = {};

  for (const locale of locales) {
    const parsed = nameSchema.safeParse(formData.get(`name_${locale}`) ?? "");
    if (!parsed.success) return null;
    if (parsed.data) names[locale] = parsed.data;
  }

  // Serbian is what every other locale falls back to, so it is the one field
  // that cannot be left empty.
  return names.sr ? names : null;
}

function readMetrics(formData: FormData): MetricKind[] {
  const allowed = new Set<string>(METRIC_KINDS);
  const picked = new Set(
    formData.getAll("metrics").map(String).filter((value) => allowed.has(value)),
  );

  // Stored in the canonical order so the builder lays the fields out the same
  // way for every machine.
  return METRIC_KINDS.filter((metric) => picked.has(metric));
}

/* ------------------------------------------------------------------ create */

export async function createTaxonomyItemAction(
  _prev: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  if (!(await isAdmin())) return fail("not_admin");

  const def = resolve(formData.get("taxonomy"));
  if (!def) return fail("not_found");

  const names = readNames(formData);
  if (!names) return fail("name_required");

  // An empty slug field means "derive one from the Serbian name".
  const typed = String(formData.get("slug") ?? "").trim();
  const slug = slugify(typed || names.sr || "");
  if (!isValidSlug(slug)) return fail("invalid_slug");

  let parentId: string | null = null;
  if (def.hasParent) {
    const parent = await readParent(formData, null);
    if (parent && typeof parent !== "string") return parent;
    parentId = parent;
  }

  try {
    const position = await nextPosition(def, parentId);

    if (def.key === "muscle_groups") {
      await db.insert(muscleGroups).values({ slug, name: names, position, parentId });
    } else {
      const table = tableOf(def);
      const [row] = await db
        .insert(table)
        .values({ slug, name: names, position })
        .returning({ id: table.id });

      if (def.hasMetrics && row) await writeMetrics(row.id, readMetrics(formData));
    }
  } catch (error) {
    if (isUniqueViolation(error)) return fail("slug_taken");
    console.error("createTaxonomyItem failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ------------------------------------------------------------------ update */

export async function updateTaxonomyItemAction(
  _prev: TaxonomyState,
  formData: FormData,
): Promise<TaxonomyState> {
  if (!(await isAdmin())) return fail("not_admin");

  const def = resolve(formData.get("taxonomy"));
  if (!def) return fail("not_found");

  const id = uuidSchema.safeParse(formData.get("id"));
  if (!id.success) return fail("not_found");

  const names = readNames(formData);
  if (!names) return fail("name_required");

  try {
    // The slug is deliberately not part of this update. It is the stable handle
    // behind URLs, seed data and saved filters — a rename must not move it.
    if (def.key === "muscle_groups") {
      const parent = await readParent(formData, id.data);
      if (parent && typeof parent !== "string") return parent;

      const changed = await db
        .update(muscleGroups)
        .set({ name: names, parentId: parent, updatedAt: new Date() })
        .where(eq(muscleGroups.id, id.data))
        .returning({ id: muscleGroups.id });

      if (!changed.length) return fail("not_found");
    } else {
      const table = tableOf(def);
      const changed = await db
        .update(table)
        .set({ name: names, updatedAt: new Date() })
        .where(eq(table.id, id.data))
        .returning({ id: table.id });

      if (!changed.length) return fail("not_found");
      if (def.hasMetrics) await writeMetrics(id.data, readMetrics(formData));
    }
  } catch (error) {
    console.error("updateTaxonomyItem failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* -------------------------------------------------------- retire / restore */

/**
 * Retiring instead of deleting. Exercises reference these ids, so a delete
 * would either cascade into finished content or trip a foreign key. A retired
 * item drops out of every picker and filter while existing tags stay intact.
 */
export async function setTaxonomyActiveAction(
  taxonomy: string,
  id: string,
  isActive: boolean,
): Promise<TaxonomyState> {
  if (!(await isAdmin())) return fail("not_admin");

  const def = taxonomyByKey(taxonomy);
  if (!def) return fail("not_found");
  if (!uuidSchema.safeParse(id).success) return fail("not_found");

  try {
    const table = tableOf(def);
    await db
      .update(table)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(table.id, id));
  } catch (error) {
    console.error("setTaxonomyActive failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* -------------------------------------------------------------------- move */

/**
 * Swaps with the neighbour, then renumbers the whole sibling list from zero.
 *
 * Renumbering rather than swapping two values keeps positions dense after
 * inserts that leave gaps, and these lists are a few dozen rows — rewriting
 * all of them costs nothing.
 */
export async function moveTaxonomyItemAction(
  taxonomy: string,
  id: string,
  direction: "up" | "down",
): Promise<TaxonomyState> {
  if (!(await isAdmin())) return fail("not_admin");

  const def = taxonomyByKey(taxonomy);
  if (!def) return fail("not_found");
  if (!uuidSchema.safeParse(id).success) return fail("not_found");

  try {
    const table = tableOf(def);

    // A muscle group reorders inside its own branch: a child moves among its
    // siblings, never out of its parent.
    let parentId: string | null = null;
    if (def.key === "muscle_groups") {
      const [row] = await db
        .select({ parentId: muscleGroups.parentId })
        .from(muscleGroups)
        .where(eq(muscleGroups.id, id));

      if (!row) return fail("not_found");
      parentId = row.parentId;
    }

    const siblings = await db
      .select({ id: table.id })
      .from(table)
      .where(siblingFilter(def, parentId))
      .orderBy(asc(table.position), asc(table.slug));

    const index = siblings.findIndex((row) => row.id === id);
    if (index < 0) return fail("not_found");

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= siblings.length) return { status: "saved" };

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];

    await db.transaction(async (tx) => {
      for (const [position, row] of siblings.entries()) {
        await tx
          .update(table)
          .set({ position, updatedAt: new Date() })
          .where(eq(table.id, row.id));
      }
    });
  } catch (error) {
    console.error("moveTaxonomyItem failed", error);
    return fail("unknown");
  }

  refresh();
  return { status: "saved" };
}

/* ----------------------------------------------------------------- helpers */

function siblingFilter(def: TaxonomyDef, parentId: string | null) {
  if (def.key !== "muscle_groups") return undefined;
  return parentId
    ? eq(muscleGroups.parentId, parentId)
    : isNull(muscleGroups.parentId);
}

async function nextPosition(def: TaxonomyDef, parentId: string | null): Promise<number> {
  const table = tableOf(def);
  const [row] = await db
    .select({ next: sql<number>`(coalesce(max(position), -1) + 1)::int` })
    .from(table)
    .where(siblingFilter(def, parentId));

  return row?.next ?? 0;
}

/**
 * Reads and validates the parent picker. Returns the parent id, `null` for a
 * top-level item, or a failed state.
 *
 * The tree stays one level deep on purpose — the schema says so, and deeper
 * nesting makes the filter UI unusable. So the chosen parent must itself be
 * top-level, and an item that already has children cannot be nested under one.
 */
async function readParent(
  formData: FormData,
  selfId: string | null,
): Promise<string | null | TaxonomyState> {
  const raw = String(formData.get("parentId") ?? "").trim();
  if (!raw) return null;
  if (raw === selfId) return fail("invalid_parent");
  if (!uuidSchema.safeParse(raw).success) return fail("invalid_parent");

  const [parent] = await db
    .select({ parentId: muscleGroups.parentId })
    .from(muscleGroups)
    .where(eq(muscleGroups.id, raw));

  if (!parent) return fail("invalid_parent");
  if (parent.parentId) return fail("invalid_parent");

  if (selfId) {
    const [child] = await db
      .select({ id: muscleGroups.id })
      .from(muscleGroups)
      .where(eq(muscleGroups.parentId, selfId))
      .limit(1);

    if (child) return fail("invalid_parent");
  }

  return raw;
}

/** Replaces the metric set wholesale — simpler than diffing, and it is tiny. */
async function writeMetrics(equipmentId: string, metrics: MetricKind[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .delete(equipmentMetrics)
      .where(eq(equipmentMetrics.equipmentId, equipmentId));

    if (!metrics.length) return;

    await tx
      .insert(equipmentMetrics)
      .values(metrics.map((metric, position) => ({ equipmentId, metric, position })));
  });
}
