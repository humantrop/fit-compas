/**
 * Shared contract for the program forms.
 *
 * Separate from actions.ts because a "use server" module may only export async
 * functions — the same rule that split lib/taxonomy/types.ts out of its
 * actions. Actions return an error *code*, never a sentence, so the client can
 * map it through the dictionary and the admin reads it in their own language.
 */
export type ProgramErrorCode =
  | "not_admin"
  | "invalid_slug"
  | "slug_taken"
  | "title_required"
  | "not_found"
  | "week_limit"
  | "last_week"
  | "workout_missing"
  | "unknown";

export type ProgramState = {
  status: "idle" | "error" | "saved";
  code?: ProgramErrorCode;
  /** Set by create, so the client can jump straight into the new editor. */
  id?: string;
};

export const PROGRAM_IDLE: ProgramState = { status: "idle" };

export type ProgramErrorCopy = Record<ProgramErrorCode, string>;
