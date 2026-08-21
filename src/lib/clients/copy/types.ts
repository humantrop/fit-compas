import type { AssignmentStatus } from "@/db/schema/clients";

import type { PlanKind } from "../schedule";

/**
 * Feature 12 keeps its own copy instead of adding a branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Those three files are edited by every feature at once, so a shared branch is
 * the one guaranteed merge conflict in a repo where several features are being
 * built in parallel — the same reasoning as `lib/library/copy/`. A typed module
 * buys something on top of that: TypeScript rejects a locale that is missing a
 * key, which is stronger than `npm run check:i18n`, since it fails at build
 * time rather than when someone remembers to run the script.
 *
 * Folding this back into the main dictionaries later is a mechanical move.
 */

/** Serbian and Russian need three plural forms where English needs two. */
export type Plural = {
  one: string;
  few?: string;
  many?: string;
  other: string;
};

export type ClientsCopy = {
  metaTitle: string;
  title: string;
  subtitle: string;

  list: {
    search: string;
    filterAll: string;
    filterAssigned: string;
    filterUnassigned: string;
    filterIdle: string;
    empty: string;
    emptyHint: string;
    emptyFiltered: string;
    count: Plural;
    assignedOf: string;
    noPlan: string;
    lastSession: string;
    never: string;
    notConfirmed: string;
    open: string;
  };

  statuses: Record<AssignmentStatus, string>;

  detail: {
    back: string;
    joined: string;
    lastSignIn: string;
    locale: string;
    units: string;
    idLabel: string;

    planHeading: string;
    planNone: string;
    planNoneHint: string;
    planStart: string;
    planProgress: string;
    planEnds: string;
    planEnded: string;
    planPaused: string;
    planPausedHint: string;

    assign: string;
    reassign: string;
    assignHeading: string;
    program: string;
    programDraft: string;
    programEmpty: string;
    startDate: string;
    startDateHint: string;
    assignNote: string;
    assignNoteHint: string;
    confirmReplace: string;
    save: string;
    saving: string;
    cancel: string;

    pause: string;
    resume: string;
    complete: string;
    cancelPlan: string;
    move: string;
    moveHint: string;

    scheduleHeading: string;
    scheduleHint: string;
    scheduleEmpty: string;
    today: string;
    kinds: Record<PlanKind, string>;
    doneMatched: string;
    doneOther: string;
    missed: string;

    historyHeading: string;
    historyEmpty: string;
    historyRange: string;

    notesHeading: string;
    notesPrivate: string;
    notesEmpty: string;
    notePlaceholder: string;
    noteAdd: string;
    noteEdit: string;
    notePin: string;
    noteUnpin: string;
    notePinned: string;
    noteDelete: string;
    noteConfirmDelete: string;
    noteEdited: string;

    activityHeading: string;
    activityEmpty: string;
    activityUnavailable: string;
    sessions: string;
    sets: string;
    volume: string;
    time: string;
    inProgress: string;
    abandoned: string;
    rpe: string;
  };

  errors: Record<
    | "not_admin"
    | "not_found"
    | "program_missing"
    | "invalid_date"
    | "note_required"
    | "note_too_long"
    | "unknown",
    string
  >;
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
