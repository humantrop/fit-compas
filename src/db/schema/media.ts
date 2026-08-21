import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { videoProvider, videoStatus } from "./enums";

/**
 * The indirection layer between content and wherever bytes happen to live.
 *
 * Exercises point at a video_assets row, never at a storage path. Moving the
 * library from Supabase Storage to Mux means writing a new VideoProvider,
 * backfilling `provider` and `playbackId`, and changing nothing else — no
 * migration of the exercises table, no touching the player.
 */
export const videoAssets = pgTable(
  "video_assets",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    provider: videoProvider("provider").notNull().default("supabase"),
    status: videoStatus("status").notNull().default("uploading"),

    /** Supabase Storage: object path inside the bucket. Null for hosted providers. */
    bucket: text("bucket"),
    storagePath: text("storage_path"),

    /** Mux/Bunny/YouTube: the provider-side id used to build a playback URL. */
    playbackId: text("playback_id"),

    /** Poster frame. Public bucket, so it can be a plain URL. */
    thumbnailPath: text("thumbnail_path"),

    durationSec: integer("duration_sec"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    mimeType: text("mime_type"),

    /** Provider webhook payloads and transcode details, kept for debugging. */
    meta: jsonb("meta").$type<Record<string, unknown>>(),

    /** Surfaced in the admin list when status is 'errored'. */
    errorMessage: text("error_message"),

    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    // The admin list filters on status to surface stuck uploads.
    index("video_assets_status_idx").on(t.status),
  ],
);

export type VideoAsset = typeof videoAssets.$inferSelect;
