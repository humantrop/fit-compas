import "server-only";

import type { VideoAsset } from "@/db/schema/media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SUPABASE_URL } from "@/lib/supabase/env";
import {
  THUMBNAIL_BUCKET,
  VIDEO_BUCKET,
  safeFileName,
  thumbnailObjectPath,
  type UploadTarget,
  type UploadTicket,
  type VideoProvider,
} from "@/lib/video/types";

/**
 * Supabase Storage implementation of VideoProvider.
 *
 * Uploads never pass through the Next.js server: the browser gets a signed URL
 * and PUTs the file straight to Storage. A 50 MB body through a Server Action
 * would be slow, would burn function time, and would hit the request body cap
 * on most hosts.
 *
 * The service-role client is used to mint those URLs. That is safe only
 * because every caller in lib/exercises/video-actions.ts checks the admin role
 * first — the key bypasses RLS, so the check cannot be left to the database.
 */
class SupabaseVideoProvider implements VideoProvider {
  readonly name = "supabase" as const;

  objectPath(assetId: string, fileName: string): string {
    return `${assetId}/${safeFileName(fileName)}`;
  }

  async createUploadTicket(assetId: string, fileName: string): Promise<UploadTicket> {
    const supabase = createSupabaseAdminClient();

    const videoPath = this.objectPath(assetId, fileName);
    const thumbnailPath = thumbnailObjectPath(assetId);

    const [video, thumbnail] = await Promise.all([
      sign(supabase, VIDEO_BUCKET, videoPath),
      sign(supabase, THUMBNAIL_BUCKET, thumbnailPath),
    ]);

    return { assetId, video, thumbnail };
  }

  async createPlaybackUrl(
    asset: VideoAsset,
    ttlSeconds: number,
  ): Promise<string | null> {
    if (!asset.storagePath) return null;

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(asset.bucket ?? VIDEO_BUCKET)
      .createSignedUrl(asset.storagePath, ttlSeconds);

    if (error || !data) return null;
    return data.signedUrl;
  }

  thumbnailUrl(asset: VideoAsset): string | null {
    if (!asset.thumbnailPath || !SUPABASE_URL) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${THUMBNAIL_BUCKET}/${asset.thumbnailPath}`;
  }

  async remove(asset: VideoAsset): Promise<void> {
    const supabase = createSupabaseAdminClient();

    // Removing a missing object is not an error worth surfacing — the row is
    // going away either way, and a stuck upload often has no object at all.
    if (asset.storagePath) {
      await supabase.storage
        .from(asset.bucket ?? VIDEO_BUCKET)
        .remove([asset.storagePath]);
    }
    if (asset.thumbnailPath) {
      await supabase.storage.from(THUMBNAIL_BUCKET).remove([asset.thumbnailPath]);
    }
  }
}

async function sign(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  path: string,
): Promise<UploadTarget> {
  // upsert: replacing a poster frame, or retrying an upload into the same
  // asset, must not fail on "object already exists".
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    throw new Error(
      `Could not create a signed upload URL for ${bucket}/${path}: ${
        error?.message ?? "unknown error"
      }`,
    );
  }

  return { uploadUrl: data.signedUrl, path: data.path, bucket };
}

export const supabaseVideoProvider = new SupabaseVideoProvider();
