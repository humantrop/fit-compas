import type { AccountErrorCopy } from "../types";

/**
 * Feature 16 keeps its own copy rather than adding an `account` branch to
 * `src/dictionaries/{sr,en,ru}.json`.
 *
 * Same reasoning as features 09 through 15: those three files are rewritten
 * whole by every parallel session, and two of them writing at once loses one
 * silently, in one language. A typed module is also checked by the compiler — a
 * locale missing a key fails `next build`, where `npm run check:i18n` only
 * fails when somebody remembers to run it.
 *
 * Folding the per-feature modules back into the shared dictionaries is one
 * mechanical pass once the parallel features have landed.
 */

export type AccountCopy = {
  meta: { title: string; description: string };

  /** The header link, in both shells. Short — it sits next to an icon. */
  nav: string;

  title: string;
  subtitle: string;

  identity: {
    title: string;
    subtitle: string;

    name: string;
    namePlaceholder: string;

    email: string;
    /** Why the address is shown but not editable here. */
    emailNote: string;
    unconfirmed: string;

    role: { admin: string; client: string };
    /** "Member since {date}". */
    joined: string;

    save: string;
    saving: string;
    saved: string;
  };

  preferences: {
    title: string;
    subtitle: string;

    units: {
      label: string;
      hint: string;
      metric: string;
      imperial: string;
      /** The symbols themselves, under each option: "kg · cm". */
      metricNote: string;
      imperialNote: string;
    };

    language: {
      label: string;
      hint: string;
    };

    email: {
      label: string;
      hint: string;
      /** Migration 0016 has not been applied — the column is not there. */
      unavailable: string;
    };

    save: string;
    saving: string;
    saved: string;
  };

  password: {
    title: string;
    subtitle: string;

    current: string;
    next: string;
    confirm: string;
    hint: string;

    submit: string;
    saving: string;
    saved: string;

    /** Escape hatch for somebody who cannot remember the current one. */
    forgot: string;
  };

  signOut: { title: string; body: string; action: string };

  errors: AccountErrorCopy;
};

/** `{name}` placeholders, resolved at render. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
