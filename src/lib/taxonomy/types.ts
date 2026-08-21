/**
 * Shared contract for the Configuration forms.
 *
 * Lives outside actions.ts because a "use server" module may only export async
 * functions. Same rule that split `lib/auth/types.ts` out of `lib/auth/actions.ts`.
 *
 * Actions return an error *code*, never a sentence — the client maps it through
 * the dictionary so the admin reads it in the language they picked.
 */
export type TaxonomyErrorCode =
  | "not_admin"
  | "invalid_slug"
  | "slug_taken"
  | "name_required"
  | "invalid_parent"
  | "not_found"
  | "unknown";

export type TaxonomyState = {
  status: "idle" | "error" | "saved";
  code?: TaxonomyErrorCode;
};

export const TAXONOMY_IDLE: TaxonomyState = { status: "idle" };

export type TaxonomyErrorCopy = Record<TaxonomyErrorCode, string>;
