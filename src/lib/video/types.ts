import type { VideoAsset } from "@/db/schema/media";

/**
 * The seam between "an exercise has a video" and "the bytes live somewhere".
 *
 * Nothing outside this folder knows the word "bucket". Exercises point at a
 * video_assets row; the row names a provider; the provider knows how to mint
 * an upload URL and a playback URL for it. Moving the library to Mux or Bunny
 * later is a second implementation of this interface plus a column value — not
 * a schema migration and not a change to the player.
 *
 * Value-import-free on the type side so client components can read the limits
 * below without pulling Drizzle into the browser bundle.
 */

export const VIDEO_BUCKET = "exercise-videos";
export const THUMBNAIL_BUCKET = "exercise-thumbnails";

/**
 * 50 MB, matching the file_size_limit set on the bucket in
 * supabase/migrations/0001. It is the hard cap of the Supabase Free plan, so
 * the number is duplicated here on purpose: the browser has to reject an
 * oversized file before spending five minutes uploading it only to be turned
 * away by Storage. Raise both together.
 */
export const MAX_VIDEO_BYTES = 52_428_800;
export const MAX_THUMBNAIL_BYTES = 5_242_880;

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export type VideoMimeType = (typeof VIDEO_MIME_TYPES)[number];

export const THUMBNAIL_MIME_TYPE = "image/jpeg";

/** Signed playback URLs are short-lived; long enough to watch, not to share. */
export const PLAYBACK_TTL_SECONDS = 60 * 60;

export type VideoProviderName = "supabase" | "mux" | "bunny" | "youtube";

/** What the browser needs to send the file straight to storage. */
export type UploadTarget = {
  /** Absolute, already carries its own credential. Nothing else is needed. */
  uploadUrl: string;
  path: string;
  bucket: string;
};

export type UploadTicket = {
  assetId: string;
  video: UploadTarget;
  /**
   * Poster frame slot, minted alongside the video so the browser can grab a
   * frame off the file it already has in memory instead of us paying for a
   * transcode.
   */
  thumbnail: UploadTarget;
};

/** Everything the browser learns about the file before it hands it over. */
export type VideoProbe = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  mimeType: string;
};

export type PlaybackSource = {
  url: string;
  /** Poster frame, public and therefore unsigned. */
  poster: string | null;
  expiresInSeconds: number;
};

export interface VideoProvider {
  readonly name: VideoProviderName;

  /** Object key for a new upload. Keyed by asset id so names never collide. */
  objectPath(assetId: string, fileName: string): string;

  createUploadTicket(assetId: string, fileName: string): Promise<UploadTicket>;

  /** Null when the asset has no playable object yet. */
  createPlaybackUrl(asset: VideoAsset, ttlSeconds: number): Promise<string | null>;

  /** Public bucket, so this is a plain URL and needs no round trip. */
  thumbnailUrl(asset: VideoAsset): string | null;

  /** Best effort: a leftover object costs storage, not correctness. */
  remove(asset: VideoAsset): Promise<void>;
}

/**
 * Strips a browser-supplied filename down to something safe as an object key.
 * The extension is kept because Storage serves content-type from metadata but
 * players still sniff the suffix.
 */
export function safeFileName(input: string): string {
  const cleaned = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);

  return cleaned || "video";
}

/**
 * Poster object key. Shared so the provider that uploads it and the action
 * that records it cannot drift — a mismatch here shows up as every thumbnail
 * silently 404ing, which reads as "the poster capture is broken".
 */
export function thumbnailObjectPath(assetId: string): string {
  return `${assetId}/poster.jpg`;
}

export function isVideoMimeType(value: string): value is VideoMimeType {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(value);
}
