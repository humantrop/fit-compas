import { z } from "zod";

import type { Translated } from "@/db/schema/i18n";
import { locales } from "@/lib/i18n/config";
import { METRIC_KINDS } from "@/lib/taxonomy/config";
import { LIMITS, SECTION_KINDS, SET_MODES, isValidTempo } from "@/lib/workouts/config";
import { DIFFICULTIES } from "@/lib/workouts/types";

/**
 * What a Server Action is allowed to believe about the draft it was handed.
 *
 * Kept out of actions.ts for the reason every shared type in this project is:
 * a `"use server"` module may only export async functions. Being an ordinary
 * module also means the schema can be exercised directly, which matters — it
 * is the only thing standing between a forged POST and the workouts table.
 */

export const uuidSchema = z.string().uuid();

/** Only filled locales are stored; `translate()` falls back for the rest. */
const translatedSchema = (max: number) =>
  z
    .record(z.string(), z.string().trim().max(max))
    .transform((value) => {
      const out: Translated = {};
      for (const locale of locales) {
        const text = value[locale]?.trim();
        if (text) out[locale] = text;
      }
      return out;
    });

const metricsSchema = z
  .record(z.string(), z.string().trim().max(16))
  .transform((value) => {
    const out: Record<string, string> = {};
    for (const metric of METRIC_KINDS) {
      const text = value[metric]?.trim();
      if (text) out[metric] = text;
    }
    return out;
  });

const itemSchema = z
  .object({
    exerciseId: uuidSchema,
    mode: z.enum(SET_MODES),
    sets: z.number().int().min(LIMITS.sets.min).max(LIMITS.sets.max),
    reps: z.number().int().min(LIMITS.reps.min).max(LIMITS.reps.max).nullable(),
    durationSec: z
      .number()
      .int()
      .min(LIMITS.durationSec.min)
      .max(LIMITS.durationSec.max)
      .nullable(),
    restSec: z.number().int().min(LIMITS.restSec.min).max(LIMITS.restSec.max),
    // Half points are meaningful — 7.5 is a prescription, not a rounding.
    rpe: z
      .number()
      .min(LIMITS.rpe.min)
      .max(LIMITS.rpe.max)
      .refine((value) => Number.isInteger(value * 2))
      .nullable(),
    tempo: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value === "" || isValidTempo(value))
      .transform((value) => value || null)
      .nullable(),
    metrics: metricsSchema,
    note: translatedSchema(LIMITS.note),
  })
  // A line has to carry the number its own mode is counted in, or the runner
  // has nothing to show and the estimate silently reads zero.
  .refine((item) => (item.mode === "reps" ? item.reps !== null : item.durationSec !== null));

const sectionSchema = z.object({
  kind: z.enum(SECTION_KINDS),
  title: translatedSchema(LIMITS.title),
  rounds: z.number().int().min(LIMITS.rounds.min).max(LIMITS.rounds.max),
  restBetweenRoundsSec: z
    .number()
    .int()
    .min(LIMITS.restSec.min)
    .max(LIMITS.restSec.max),
  restAfterSec: z.number().int().min(LIMITS.restSec.min).max(LIMITS.restSec.max),
  items: z.array(itemSchema).max(LIMITS.itemsPerSection),
});

export const draftSchema = z.object({
  id: uuidSchema,
  title: translatedSchema(LIMITS.title),
  description: translatedSchema(LIMITS.description),
  difficulty: z.enum(DIFFICULTIES),
  goalIds: z.array(uuidSchema).max(20),
  activityIds: z.array(uuidSchema).max(20),
  sections: z.array(sectionSchema).max(LIMITS.sections),
});

