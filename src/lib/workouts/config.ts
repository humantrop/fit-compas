import type { setMode, workoutSectionKind } from "@/db/schema/enums";

/**
 * Shape and limits of a workout, in one place both sides agree on.
 *
 * Type-only imports: this module is pulled into the builder, which is a client
 * component. A value import from `@/db/schema` would drag Drizzle and the
 * postgres driver into the browser bundle.
 */

export type SectionKind = (typeof workoutSectionKind)["enumValues"][number];
export type SetMode = (typeof setMode)["enumValues"][number];

/** Rendered in this order. A session reads warm-up, work, cool-down. */
export const SECTION_KINDS = ["warmup", "main", "cooldown"] as const satisfies
  readonly SectionKind[];

export const SET_MODES = ["reps", "time"] as const satisfies readonly SetMode[];

/**
 * Only one warm-up and one cool-down per session — they are the bookends, not
 * blocks you stack. The middle is unbounded.
 */
export const SINGLETON_KINDS: readonly SectionKind[] = ["warmup", "cooldown"];

export const LIMITS = {
  sections: 12,
  itemsPerSection: 12,
  rounds: { min: 1, max: 20 },
  sets: { min: 1, max: 20 },
  reps: { min: 1, max: 500 },
  durationSec: { min: 5, max: 3600 },
  restSec: { min: 0, max: 900 },
  rpe: { min: 1, max: 10 },
  title: 90,
  description: 600,
  note: 200,
} as const;

/** Offered as chips next to every rest field — typing 90 twenty times is a chore. */
export const REST_PRESETS = [0, 30, 45, 60, 90, 120, 180] as const;

/**
 * Four digits: eccentric - pause - concentric - pause. "3-1-1-0" is three
 * seconds down, one at the bottom, one up, none at the top. `X` means
 * explosive, which is why this is not four integers.
 */
export const TEMPO_PATTERN = /^[0-9X]-[0-9X]-[0-9X]-[0-9X]$/;

export function isValidTempo(value: string): boolean {
  return TEMPO_PATTERN.test(value.trim().toUpperCase());
}

/** RPE is prescribed in half points — 7.5 is a real target, not a rounding. */
export function isValidRpe(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= LIMITS.rpe.min &&
    value <= LIMITS.rpe.max &&
    Math.abs(value * 2 - Math.round(value * 2)) < 1e-9
  );
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** "1:30", "45s", "1h 05:00" — durations here run from seconds to an hour plus. */
export function formatDuration(totalSec: number): string {
  const seconds = Math.max(0, Math.round(totalSec));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h) return `${h}h ${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  if (m) return `${m}:${String(s).padStart(2, "0")}`;
  return `${s}s`;
}
