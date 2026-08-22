/**
 * What the account screen reads and writes.
 *
 * Separate from `actions.ts` because a `"use server"` module may only export
 * async functions — `export const ACCOUNT_IDLE = {...}` in that file is a build
 * error, not a lint warning. Same split every feature here uses.
 *
 * Actions return a *code*, never a sentence. The screen maps it through this
 * feature's copy module, so somebody reading the app in Russian is told what
 * went wrong in Russian, and the same failure cannot be worded two ways on two
 * screens.
 */

export type AccountErrorCode =
  | "unauthenticated"
  /** Supabase env vars are missing — local dev without a project. */
  | "not_configured"
  | "invalid_name"
  | "invalid_units"
  | "invalid_locale"
  /** The current password did not match. Checked by re-authenticating. */
  | "wrong_password"
  | "weak_password"
  | "passwords_mismatch"
  /** Supabase refuses a "new" password identical to the old one. */
  | "same_password"
  | "rate_limited"
  /** The write did not land — most likely migration 0016 has not been run. */
  | "unavailable"
  | "unknown";

export type AccountState = {
  status: "idle" | "error" | "saved";
  code?: AccountErrorCode;
};

export const ACCOUNT_IDLE: AccountState = { status: "idle" };

export type AccountErrorCopy = Record<AccountErrorCode, string>;

/** Bounds shared by the form and the action, so both refuse the same input. */
export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/* ------------------------------------------------------------------ views */

/**
 * The account as the screen sees it.
 *
 * The email and the dates come from `auth.users`, which Supabase owns and this
 * app never declares as a table; the rest is the `profiles` row. Both are
 * already loaded for any signed-in request, so this is a shape, not a query.
 */
export type AccountView = {
  fullName: string | null;
  email: string | null;
  locale: string | null;
  units: string;
  role: string;
  /** ISO instant the account was created. */
  joinedAt: string | null;
  emailConfirmed: boolean;
  /**
   * Null when the column is unreachable — migration 0016 has not been applied.
   * The toggle then renders disabled with a line saying so, rather than
   * pretending to hold a value it cannot write.
   */
  emailNotifications: boolean | null;
};
