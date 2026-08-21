/**
 * Shared auth form contract.
 *
 * Lives outside actions.ts because a "use server" module may only export async
 * functions — a plain `export const IDLE` there is a build error.
 *
 * Actions return an error *code*, never a sentence. The client maps the code
 * through the dictionary, so a Serbian user sees a Serbian error even though
 * Supabase replied in English.
 */
export type AuthErrorCode =
  | "not_configured"
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_taken"
  | "weak_password"
  | "invalid_email"
  | "passwords_mismatch"
  | "rate_limited"
  | "invalid_link"
  | "unknown";

export type AuthState = {
  status: "idle" | "error" | "sent";
  code?: AuthErrorCode;
};

export const IDLE: AuthState = { status: "idle" };

export type AuthErrorCopy = Record<AuthErrorCode, string>;
