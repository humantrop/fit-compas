/**
 * Feature 11 keeps its own copy rather than adding a `dashboard` branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Same reasoning as features 09 and 10: those three files are rewritten by
 * every feature at once, and a whole-file write by two parallel sessions loses
 * one of them silently, in one language. A typed module also gets checked by
 * the compiler — a locale missing a key fails `next build`, where
 * `npm run check:i18n` only fails when somebody remembers to run it.
 *
 * The existing `dashboard` key in the three shared dictionaries stays where it
 * is: `getDictionary()` is loaded by other screens too, and deleting a branch
 * out of a shared file is exactly the edit that loses a parallel session's
 * work. Folding all four of these per-feature modules back in is one
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

export type DashboardCopy = {
  meta: { title: string; description: string };

  chrome: {
    signOut: string;
    admin: string;
    tabs: { today: string; plan: string; workouts: string; library: string };
  };

  /** Picked by the hour, in the reader's own time zone. */
  greeting: { morning: string; afternoon: string; evening: string };
  subtitle: string;

  access: { title: string; body: string };

  /** Shown when auth has a user but `profiles` has no row for them. */
  noProfile: string;

  today: {
    eyebrow: string;
    scheduledEyebrow: string;
    resumeEyebrow: string;
    doneEyebrow: string;

    /** No assignment engine yet — see lib/dashboard/schedule-source.ts. */
    pendingTitle: string;
    pendingBody: string;

    restTitle: string;
    restBody: string;

    /** The plan is known and today simply has nothing on it. Not the same as rest. */
    openTitle: string;
    openBody: string;

    doneTitle: string;
    doneBody: string;

    start: string;
    resume: string;
    browse: string;
    /** "3 of 18 sets logged". */
    resumeProgress: string;
  };

  week: {
    title: string;
    /** Monday first — all three locales start the week there. */
    weekdays: [string, string, string, string, string, string, string];
    done: Plural;
    legend: { done: string; today: string; rest: string; planned: string };
  };

  streak: {
    title: string;
    days: Plural;
    none: string;
    /** Today is already logged. */
    kept: string;
    /** The streak is alive but today is still open. */
    atRisk: string;
    best: string;
  };

  stats: {
    title: string;
    ranges: { week: string; month: string; all: string };
    workouts: string;
    sets: string;
    volume: string;
    time: string;
    /** Unit suffixes. Volume switches to tonnes past 1000 kg. */
    kg: string;
    tonnes: string;
    hours: string;
    minutes: string;
    unavailable: string;
  };

  suggestions: {
    title: string;
    body: string;
    demoNotice: string;
    empty: string;
    sets: string;
    minutes: string;
  };

  recent: {
    title: string;
    empty: string;
    all: string;
    sets: string;
  };

  quick: {
    library: { label: string; body: string };
    workouts: { label: string; body: string };
  };
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

/** `fill("{done} of {total}", { done: 3, total: 18 })`. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
