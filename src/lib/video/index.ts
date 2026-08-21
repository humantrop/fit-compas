import "server-only";

import type { VideoAsset } from "@/db/schema/media";
import { supabaseVideoProvider } from "@/lib/video/supabase";
import {
  PLAYBACK_TTL_SECONDS,
  type PlaybackSource,
  type VideoProvider,
  type VideoProviderName,
} from "@/lib/video/types";

/**
 * Provider registry.
 *
 * One entry today. The point of the map is that adding Mux is a new file plus
 * a line here, and that every call site already asks the *asset* which
 * provider it belongs to instead of assuming Supabase.
 */
const providers: Partial<Record<VideoProviderName, VideoProvider>> = {
  supabase: supabaseVideoProvider,
};

/** The provider new uploads go to. */
export const DEFAULT_VIDEO_PROVIDER: VideoProviderName = "supabase";

export function getVideoProvider(name: VideoProviderName): VideoProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(
      `Video provider "${name}" is referenced by a video_assets row but has no ` +
        `implementation. Add one in src/lib/video/ and register it here.`,
    );
  }
  return provider;
}

export function providerFor(asset: VideoAsset): VideoProvider {
  return getVideoProvider(asset.provider);
}

/** Signed URL plus poster, or null when the asset is not playable yet. */
export async function playbackSourceFor(
  asset: VideoAsset,
  ttlSeconds: number = PLAYBACK_TTL_SECONDS,
): Promise<PlaybackSource | null> {
  const provider = providerFor(asset);
  const url = await provider.createPlaybackUrl(asset, ttlSeconds);
  if (!url) return null;

  return {
    url,
    poster: provider.thumbnailUrl(asset),
    expiresInSeconds: ttlSeconds,
  };
}

export * from "@/lib/video/types";
