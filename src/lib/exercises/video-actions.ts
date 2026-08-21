"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { exercises } from "@/db/schema/exercises";
import { videoAssets } from "@/db/schema/media";
import { getProfile } from "@/lib/auth/session";
import { getAccess } from "@/lib/billing/access";
import { getVideoAsset } from "@/lib/exercises/queries";
import type { ActionResult } from "@/lib/exercises/types";
import { DEFAULT_VIDEO_PROVIDER, getVideoProvider, playbackSourceFor } from "@/lib/video";
import {
  MAX_VIDEO_BYTES,
  PLAYBACK_TTL_SECONDS,
  VIDEO_BUCKET,
  isVideoMimeType,
  thumbnailObjectPath,
  type PlaybackSource,
  type UploadTicket,
} from "@/lib/video/types";

/**
 * The upload handshake.
 *
 * The file never passes through this server. The browser asks for a ticket,
 * PUTs the bytes straight to Storage, then reports back. Three round trips of
 * a few hundred bytes each instead of 50 MB through a Server Action.
 *
 * Every function here is reachable by a direct POST, not only through our UI,
 * so each one re-checks the role. Drizzle connects as `postgres` and the
 * storage calls use the service-role key — both bypass RLS, so the database
 * will not catch a missing check.
 */

async function requireAdminProfile() {
  const profile = await getProfile();
  return profile?.role === "admin" ? profile : null;
}

const ticketInput = z.object({
  fileName: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
});

export async function createVideoUploadTicketAction(
  input: z.input<typeof ticketInput>,
): Promise<ActionResult<{ ticket: UploadTicket }>> {
  const profile = await requireAdminProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  const parsed = ticketInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "unknown" };

  const { fileName, sizeBytes, mimeType } = parsed.data;

  // Both limits are enforced by the bucket as well. Checking here turns a
  // rejected 50 MB upload into an instant message instead of a wasted upload.
  if (sizeBytes > MAX_VIDEO_BYTES) return { ok: false, code: "video_too_large" };
  if (!isVideoMimeType(mimeType)) return { ok: false, code: "video_type" };

  try {
    const [asset] = await db
      .insert(videoAssets)
      .values({
        provider: DEFAULT_VIDEO_PROVIDER,
        status: "uploading",
        bucket: VIDEO_BUCKET,
        storagePath: null,
        mimeType,
        sizeBytes,
        createdBy: profile.id,
      })
      .returning();

    if (!asset) return { ok: false, code: "unknown" };

    const provider = getVideoProvider(DEFAULT_VIDEO_PROVIDER);
    const ticket = await provider.createUploadTicket(asset.id, fileName);

    // The path is written now rather than on confirm: if the browser dies
    // mid-upload the row still points at the object, so the cleanup in
    // discardVideoAssetAction has something to delete.
    await db
      .update(videoAssets)
      .set({ storagePath: ticket.video.path, updatedAt: new Date() })
      .where(eq(videoAssets.id, asset.id));

    return { ok: true, ticket };
  } catch (error) {
    console.error("createVideoUploadTicketAction", error);
    return { ok: false, code: "unknown" };
  }
}

const confirmInput = z.object({
  assetId: z.string().uuid(),
  /**
   * The exercise being edited, when there is one. A finished upload attaches
   * itself right away rather than waiting for Save: the admin who uploaded a
   * video and navigated away expects the video to be there, and the previous
   * one has already been detached by then.
   */
  exerciseId: z.string().uuid().nullable(),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string().min(1).max(100),
  durationSec: z.number().int().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  /** False when the browser could not grab a frame — playback still works. */
  hasThumbnail: z.boolean(),
});

export async function confirmVideoUploadAction(
  input: z.input<typeof confirmInput>,
): Promise<ActionResult<{ thumbnailUrl: string | null }>> {
  const profile = await requireAdminProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  const parsed = confirmInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "unknown" };

  const { assetId, exerciseId, hasThumbnail, ...probe } = parsed.data;

  try {
    const asset = await getVideoAsset(assetId);
    if (!asset) return { ok: false, code: "not_found" };

    const [updated] = await db
      .update(videoAssets)
      .set({
        // Supabase Storage serves the file as uploaded — there is no transcode
        // step, so "uploaded" and "ready" are the same moment. A provider with
        // a pipeline sets 'processing' here and flips to 'ready' on webhook.
        status: "ready",
        durationSec: probe.durationSec,
        width: probe.width,
        height: probe.height,
        sizeBytes: probe.sizeBytes,
        mimeType: probe.mimeType,
        thumbnailPath: hasThumbnail ? thumbnailObjectPath(assetId) : null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(videoAssets.id, assetId))
      .returning();

    if (!updated) return { ok: false, code: "not_found" };

    if (exerciseId) {
      await db
        .update(exercises)
        .set({ videoAssetId: assetId, updatedAt: new Date() })
        .where(eq(exercises.id, exerciseId));
    }

    return {
      ok: true,
      thumbnailUrl: getVideoProvider(updated.provider).thumbnailUrl(updated),
    };
  } catch (error) {
    console.error("confirmVideoUploadAction", error);
    return { ok: false, code: "unknown" };
  }
}

const failInput = z.object({
  assetId: z.string().uuid(),
  message: z.string().max(500),
});

/**
 * Records why an upload died. The row is kept rather than deleted so the list
 * can surface it under the "needs attention" filter — a video that silently
 * disappears is the version of this bug nobody reports.
 */
export async function failVideoUploadAction(
  input: z.input<typeof failInput>,
): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  const parsed = failInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "unknown" };

  try {
    await db
      .update(videoAssets)
      .set({
        status: "errored",
        errorMessage: parsed.data.message.slice(0, 500),
        updatedAt: new Date(),
      })
      .where(eq(videoAssets.id, parsed.data.assetId));

    return { ok: true };
  } catch (error) {
    console.error("failVideoUploadAction", error);
    return { ok: false, code: "unknown" };
  }
}

/**
 * Drops the asset and its objects. The FK on exercises.video_asset_id is
 * `on delete set null`, so any exercise pointing at it is detached by the
 * delete itself — there is no second write to forget.
 */
export async function discardVideoAssetAction(
  assetId: string,
): Promise<ActionResult> {
  const profile = await requireAdminProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  if (!z.string().uuid().safeParse(assetId).success) {
    return { ok: false, code: "unknown" };
  }

  try {
    const asset = await getVideoAsset(assetId);
    if (!asset) return { ok: true };

    // Storage first: a failed object delete leaves a file behind, which costs
    // quota. A failed row delete after a successful object delete would leave
    // an exercise pointing at bytes that are gone, which costs a broken page.
    await getVideoProvider(asset.provider).remove(asset);
    await db.delete(videoAssets).where(eq(videoAssets.id, assetId));

    return { ok: true };
  } catch (error) {
    console.error("discardVideoAssetAction", error);
    return { ok: false, code: "unknown" };
  }
}

/* ---------------------------------------------------------------- playback */

/**
 * Admin preview. Used by the editor, where the exercise may not exist yet —
 * the video is uploaded before the row is saved.
 */
export async function signVideoAssetAction(
  assetId: string,
): Promise<ActionResult<{ playback: PlaybackSource }>> {
  const profile = await requireAdminProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  if (!z.string().uuid().safeParse(assetId).success) {
    return { ok: false, code: "unknown" };
  }

  const asset = await getVideoAsset(assetId);
  if (!asset) return { ok: false, code: "not_found" };

  const playback = await playbackSourceFor(asset, PLAYBACK_TTL_SECONDS);
  if (!playback) return { ok: false, code: "video_not_ready" };

  return { ok: true, playback };
}

/**
 * The client-facing door, written now so feature 09 has nothing to retrofit.
 *
 * Two gates, in this order: the exercise must be published, and the viewer
 * must have access. `getAccess()` lets everyone through until feature 18 — the
 * point is that the call site already exists, so turning billing on is a
 * change to one function body rather than to every route that plays a video.
 */
export async function signExerciseVideoAction(
  exerciseId: string,
): Promise<ActionResult<{ playback: PlaybackSource }>> {
  const profile = await getProfile();
  if (!profile) return { ok: false, code: "not_admin" };

  if (!z.string().uuid().safeParse(exerciseId).success) {
    return { ok: false, code: "unknown" };
  }

  const [row] = await db
    .select({
      isPublished: exercises.isPublished,
      videoAssetId: exercises.videoAssetId,
    })
    .from(exercises)
    .where(eq(exercises.id, exerciseId))
    .limit(1);

  if (!row) return { ok: false, code: "not_found" };

  const isAdmin = profile.role === "admin";
  if (!row.isPublished && !isAdmin) return { ok: false, code: "not_found" };

  if (!isAdmin) {
    const access = await getAccess(profile);
    if (!access.active) return { ok: false, code: "not_admin" };
  }

  if (!row.videoAssetId) return { ok: false, code: "video_not_ready" };

  const asset = await getVideoAsset(row.videoAssetId);
  if (!asset) return { ok: false, code: "video_not_ready" };

  const playback = await playbackSourceFor(asset, PLAYBACK_TTL_SECONDS);
  if (!playback) return { ok: false, code: "video_not_ready" };

  return { ok: true, playback };
}
