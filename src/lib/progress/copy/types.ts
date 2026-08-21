import type { BodyMetric, PhotoPose } from "@/db/schema/progress";

import type { ProgressErrorCopy } from "../types";

/**
 * Feature 14 keeps its own copy rather than adding a `progress` branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Same reasoning as features 09 through 13: those three files are rewritten by
 * every parallel session at once, and a whole-file write by two of them loses
 * one silently, in one language. A typed module is also checked by the
 * compiler — a locale missing a key fails `next build`, where
 * `npm run check:i18n` only fails when somebody remembers to run it.
 *
 * Folding the per-feature modules back into the shared dictionaries is one
 * mechanical pass once the parallel features have landed.
 *
 * The streak card is deliberately absent from this shape: the progress screen
 * renders `components/dashboard/streak-card.tsx` with the dashboard's own copy.
 * It is the same number about the same days, and a second wording of "you kept
 * it going today" is how two screens end up disagreeing about what a streak is.
 */

/**
 * Serbian and Russian need three plural forms where English needs two, so a
 * count cannot be a string with a number glued in front. Resolved through
 * `Intl.PluralRules`; `{n}` is the placeholder.
 */
export type Plural = {
  one: string;
  few?: string;
  many?: string;
  other: string;
};

export type ProgressCopy = {
  meta: { title: string; description: string };

  title: string;
  subtitle: string;

  access: { title: string; body: string };

  /** The three screens under Progress. */
  nav: { overview: string; measurements: string; photos: string };

  /** Migration 0014 has not been applied — the tables are unreachable. */
  unavailable: string;
  /** The runner's log is unreachable — migration 0010. */
  trainingUnavailable: string;

  /** Metric names, in the reader's language. Keys are the database enum. */
  metrics: Record<BodyMetric, string>;
  poses: Record<PhotoPose, string>;

  overview: {
    bodyTitle: string;
    bodyEmpty: { title: string; body: string; action: string };

    /** "since {date}" — the change is measured against the first entry. */
    since: string;
    noChange: string;
    /** "measured {date}". */
    measuredOn: string;

    trainingTitle: string;
    trainingSubtitle: string;
    trainingEmpty: string;
    /** "week of {date}", the label under a column. */
    weekOf: string;
    /** "{n} sessions", inside a column's tooltip. */
    sessions: Plural;

    heatTitle: string;
    heatSubtitle: string;
    heatLess: string;
    heatMore: string;

    totalsTitle: string;
    totals: { workouts: string; sets: string; volume: string; time: string };

    photosTitle: string;
    photosEmpty: string;
    photosAction: string;
    seeAll: string;
  };

  chart: {
    metricLabel: string;
    rangeLabel: string;
    ranges: { d90: string; d180: string; d365: string; all: string };
    /** A single measurement is a dot, not a trend. */
    onePoint: string;
    empty: string;
  };

  measure: {
    title: string;
    subtitle: string;

    formTitle: string;
    metric: string;
    day: string;
    value: string;
    /** "between {min} and {max} {unit}" — the same bounds the server checks. */
    rangeHint: string;
    submit: string;
    saving: string;
    saved: string;

    historyTitle: string;
    historyEmpty: string;
    columns: { day: string; metric: string; value: string; change: string };
    remove: string;
    /** Re-entering a metric on a day already recorded replaces it. */
    replaceNote: string;
  };

  photos: {
    title: string;
    subtitle: string;

    uploadTitle: string;
    day: string;
    pose: string;
    choose: string;
    hint: string;
    preparing: string;
    uploading: string;
    finishing: string;
    cancel: string;
    tooLarge: string;
    wrongType: string;
    /** Same day, same pose — the new photo takes the slot. */
    slotNote: string;

    galleryTitle: string;
    galleryEmpty: string;
    /** The object could not be signed — the row is there, the image is not. */
    missing: string;
    remove: string;

    compareTitle: string;
    compareHint: string;
    compareFrom: string;
    compareTo: string;
    compareEmpty: string;
    /** "{n} days apart". */
    apart: Plural;
  };

  errors: ProgressErrorCopy;
};

export function plural(plurals: Plural, n: number, localeTag: string): string {
  const category = new Intl.PluralRules(localeTag).select(n);

  const form =
    category === "one"
      ? plurals.one
      : category === "few"
        ? (plurals.few ?? plurals.other)
        : category === "many"
          ? (plurals.many ?? plurals.few ?? plurals.other)
          : plurals.other;

  return form.replace("{n}", new Intl.NumberFormat(localeTag).format(n));
}

/** `fill("between {min} and {max} {unit}", { min: 40, max: 200, unit: "cm" })`. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
