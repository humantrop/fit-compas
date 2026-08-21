import type { PlanErrorCopy } from "../types";

/**
 * Feature 13 keeps its own copy rather than adding a `plan` branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Same reasoning as features 09 through 12: those three files are rewritten by
 * every parallel session at once, and a whole-file write by two of them loses
 * one silently, in one language. A typed module is also checked by the
 * compiler — a locale missing a key fails `next build`, where
 * `npm run check:i18n` only fails when somebody remembers to run it.
 *
 * Folding the per-feature modules back into the shared dictionaries is one
 * mechanical pass once the parallel features have landed.
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

export type PlanCopy = {
  meta: { title: string; description: string };

  title: string;
  subtitle: string;

  access: { title: string; body: string };

  /** No program assigned. Not an error, and not an empty grid either. */
  empty: { title: string; body: string; action: string };

  header: {
    eyebrow: string;
    /** "Week {week} of {total}". */
    progress: string;
    /** "Day {day}". */
    dayOf: string;
    percent: string;
    starts: string;
    ends: string;
    /** The plan is assigned but its first day has not arrived. */
    notStarted: string;
    /** Today is past the last day of the grid. */
    finished: string;
    paused: string;
    weeks: Plural;
  };

  calendar: {
    /** Monday first — all three locales start the week there. */
    weekdays: [string, string, string, string, string, string, string];
    previous: string;
    next: string;
    today: string;
    legend: {
      workout: string;
      done: string;
      rest: string;
      moved: string;
      today: string;
    };
  };

  day: {
    /** What the plan says. `open` is not `rest` — see the program editor. */
    kinds: {
      workout: string;
      rest: string;
      open: string;
      before: string;
      after: string;
    };
    restBody: string;
    openBody: string;
    beforeBody: string;
    afterBody: string;

    /** "Week 3 · Day 2". */
    context: string;

    movedFrom: string;
    movedTo: string;

    doneMatched: string;
    /** Ticked off by hand rather than recorded by the runner. */
    doneSelf: string;
    doneOther: string;
    missed: string;

    start: string;
    /** The runner still serves demo plans — see lib/runner/source.ts. */
    runnerPending: string;

    markDone: string;
    unmark: string;

    moveHeading: string;
    moveLabel: string;
    moveHint: string;
    move: string;
    undoMove: string;

    saving: string;
  };

  upcoming: { title: string; empty: string };

  logUnavailable: string;

  errors: PlanErrorCopy;
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

/** `fill("Week {week} of {total}", { week: 3, total: 8 })`. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
