import type { PhotoPose } from "@/db/schema/progress";

/**
 * The seam between "a progress photo" and "an object in a bucket".
 *
 * Value-import-free so the uploader — a client component — can read the limits
 * and the accepted types without pulling Drizzle or `server-only` into the
 * browser bundle. The same split `lib/video/types.ts` makes, and for the same
 * reason: the browser has to reject a 40 MB photo before spending a minute
 * sending it to a bucket that will refuse it.
 *
 * The bucket is not new. `supabase/migrations/0001` created `progress-photos`
 * as private, capped at 10 MB, images only, with policies keyed on the
 * `{user_id}/…` prefix — written before there was a screen for it. Everything
 * here matches those numbers, and they are duplicated on purpose: raise one
 * and you have to raise the other, which is better than a browser that lets a
 * file through and a bucket that does not.
 */

export const PROGRESS_PHOTO_BUCKET = "progress-photos";

/** 10 MB, matching `file_size_limit` on the bucket in migration 0001. */
export const MAX_PHOTO_BYTES = 10_485_760;

export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type PhotoMimeType = (typeof PHOTO_MIME_TYPES)[number];

export function isPhotoMimeType(value: string): value is PhotoMimeType {
  return (PHOTO_MIME_TYPES as readonly string[]).includes(value);
}

export const PHOTO_POSES: PhotoPose[] = ["front", "side", "back"];

export function isPhotoPose(value: unknown): value is PhotoPose {
  return (
    typeof value === "string" && (PHOTO_POSES as readonly string[]).includes(value)
  );
}

/**
 * Signed view URLs are short-lived. Long enough to look at a gallery and to
 * compare two shots side by side; not long enough to be worth passing on.
 */
export const PHOTO_URL_TTL_SECONDS = 60 * 60;

const EXTENSIONS: Record<PhotoMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function extensionFor(mimeType: PhotoMimeType): string {
  return EXTENSIONS[mimeType];
}

/**
 * Object key for a photo.
 *
 * The `{userId}/` prefix is not decoration — it is the whole of the storage
 * policy. `(storage.foldername(name))[1] = auth.uid()::text` is what stops one
 * client reading another's photos, so a path built any other way would be a
 * quiet hole in a rule that looks enforced.
 *
 * The random id in the middle rather than the date and pose is what makes a
 * replacement safe: the new object is written before the old row is updated,
 * so a failed upload cannot leave a row pointing at nothing. The old object is
 * deleted afterwards, by the path the row was carrying.
 */
export function photoObjectPath(
  userId: string,
  photoId: string,
  mimeType: PhotoMimeType,
): string {
  return `${userId}/${photoId}.${extensionFor(mimeType)}`;
}

/** What the browser needs to send the file straight to Storage. */
export type PhotoUploadTicket = {
  photoId: string;
  uploadUrl: string;
  path: string;
};

/** What the browser learns about the file before handing it over. */
export type PhotoProbe = {
  width: number | null;
  height: number | null;
};
