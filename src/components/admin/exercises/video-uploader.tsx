"use client";

import { AlertTriangle, CheckCircle2, Film, Play, Trash2, Upload, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Chip, Hint, formatBytes, formatDuration } from "@/components/admin/exercises/ui";
import {
  confirmVideoUploadAction,
  createVideoUploadTicketAction,
  discardVideoAssetAction,
  failVideoUploadAction,
  signVideoAssetAction,
} from "@/lib/exercises/video-actions";
import type { ExerciseErrorCode } from "@/lib/exercises/types";
import type { ExercisesDictionary } from "@/lib/i18n/exercises-dictionary";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MIME_TYPES,
  isVideoMimeType,
  type UploadTarget,
} from "@/lib/video/types";
import { cn } from "@/lib/utils";

export type UploaderAsset = {
  id: string;
  status: "uploading" | "processing" | "ready" | "errored";
  thumbnailUrl: string | null;
  durationSec: number | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
};

type Phase = "idle" | "preparing" | "uploading" | "finishing";

/**
 * Video upload for one exercise.
 *
 * The file goes straight from the browser to Storage over a signed URL — it
 * never passes through a Server Action. That is what makes a real progress bar
 * possible, and it is the only way 50 MB over a phone connection is workable:
 * the alternative is a single opaque request that either finishes or does not.
 *
 * The component owns its own hidden `video_asset_id` input, so the surrounding
 * form does not need to know any of this exists.
 */
export function VideoUploader({
  exerciseId,
  initialAsset,
  copy,
  errors,
}: {
  /**
   * Null while creating: there is no row to attach to yet, so the hidden input
   * below carries the asset id into the create action instead.
   */
  exerciseId: string | null;
  initialAsset: UploaderAsset | null;
  copy: ExercisesDictionary["video"];
  errors: ExercisesDictionary["errors"];
}) {
  const [asset, setAsset] = useState<UploaderAsset | null>(initialAsset);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [signing, startSigning] = useTransition();

  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<XMLHttpRequest | null>(null);

  const busy = phase !== "idle";

  function reportError(code: ExerciseErrorCode) {
    setError(errors[code]);
    setPhase("idle");
    setProgress(0);
  }

  async function handleFile(file: File) {
    setError(null);
    setPreview(null);

    const mimeType = resolveMimeType(file);
    if (!isVideoMimeType(mimeType)) return setError(copy.wrongType);
    if (file.size > MAX_VIDEO_BYTES) return setError(copy.tooLarge);

    const previousId = asset?.id ?? null;

    setPhase("preparing");
    setProgress(0);

    // Metadata is read before the upload starts: the browser already has the
    // file, so duration and dimensions cost nothing here. Asking a server to
    // work them out afterwards would mean a transcode we are not paying for.
    const probe = await probeVideo(file);

    const ticket = await createVideoUploadTicketAction({
      fileName: file.name,
      sizeBytes: file.size,
      mimeType,
    });

    if (!ticket.ok) return reportError(ticket.code);

    const assetId = ticket.ticket.assetId;

    try {
      setPhase("uploading");
      await put(ticket.ticket.video, file, mimeType, setProgress, request);

      // Best effort: a missing poster costs a grey card in the list, not a
      // broken video. Never worth failing the upload over.
      if (probe.poster) {
        try {
          await put(ticket.ticket.thumbnail, probe.poster, "image/jpeg");
        } catch {
          probe.poster = null;
        }
      }

      setPhase("finishing");
      const confirmed = await confirmVideoUploadAction({
        assetId,
        exerciseId,
        sizeBytes: file.size,
        mimeType,
        durationSec: probe.durationSec,
        width: probe.width,
        height: probe.height,
        hasThumbnail: Boolean(probe.poster),
      });

      if (!confirmed.ok) return reportError(confirmed.code);

      setAsset({
        id: assetId,
        status: "ready",
        thumbnailUrl: confirmed.thumbnailUrl,
        durationSec: probe.durationSec,
        sizeBytes: file.size,
        width: probe.width,
        height: probe.height,
      });
      setPhase("idle");
      setProgress(0);

      // Only once the replacement is safely in place. Dropping the old asset
      // first would lose the working video if the new upload failed.
      if (previousId) await discardVideoAssetAction(previousId);
    } catch (cause) {
      const aborted = cause instanceof DOMException && cause.name === "AbortError";
      await failVideoUploadAction({
        assetId,
        message: aborted ? "cancelled by the admin" : String(cause).slice(0, 400),
      });
      // A cancel is a decision, not a failure — say nothing and go back to the
      // video that was already there.
      if (aborted) {
        setPhase("idle");
        setProgress(0);
        await discardVideoAssetAction(assetId);
        return;
      }
      reportError("upload_failed");
    } finally {
      request.current = null;
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleRemove() {
    if (!asset) return;
    const id = asset.id;
    setAsset(null);
    setPreview(null);
    setError(null);
    await discardVideoAssetAction(id);
  }

  function handlePreview() {
    if (!asset) return;
    if (preview) return setPreview(null);

    startSigning(async () => {
      const signed = await signVideoAssetAction(asset.id);
      if (!signed.ok) return setError(copy.previewFailed);
      setPreview(signed.playback.url);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="video_asset_id" value={asset?.id ?? ""} />

      <input
        ref={fileInput}
        type="file"
        accept={VIDEO_MIME_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {asset ? (
        <Surface tone="bare" className="flex flex-col gap-4 p-4">
          <div className="flex items-start gap-4">
            <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-control border border-white/8 bg-base-900">
              {asset.thumbnailUrl ? (
                // Not next/image: the poster lives on Supabase Storage, and
                // adding a remote pattern to next.config is a shared-file edit
                // this feature is deliberately staying out of.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.thumbnailUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-ink-600">
                  <Film className="size-6" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <StatusLine status={asset.status} copy={copy} />

              <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-400">
                <Detail label={copy.duration} value={formatDuration(asset.durationSec)} />
                <Detail label={copy.size} value={formatBytes(asset.sizeBytes)} />
                {asset.width && asset.height ? (
                  <Detail
                    label={copy.resolution}
                    value={`${asset.width}×${asset.height}`}
                  />
                ) : null}
              </dl>
            </div>
          </div>

          {preview ? (
            <video
              src={preview}
              controls
              playsInline
              className="w-full rounded-control border border-white/8 bg-black"
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePreview}
              disabled={busy || signing || asset.status !== "ready"}
            >
              <Play className="size-4" />
              {preview ? copy.hidePreview : copy.preview}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              <Upload className="size-4" />
              {copy.replace}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleRemove()}
              disabled={busy}
            >
              <Trash2 className="size-4" />
              {copy.remove}
            </Button>
          </div>
        </Surface>
      ) : (
        <Surface
          tone="bare"
          className="flex flex-col items-start gap-3 border-dashed p-6"
        >
          <span className="inline-flex size-11 items-center justify-center rounded-control border border-white/8 bg-white/4 text-ink-400">
            <Film className="size-5" />
          </span>
          <p className="text-[13px] text-ink-400">{copy.empty}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            <Upload className="size-4" />
            {copy.choose}
          </Button>
        </Surface>
      )}

      {busy ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px] text-ink-400">
            <span>
              {phase === "preparing"
                ? copy.preparing
                : phase === "finishing"
                  ? copy.finishing
                  : `${copy.uploading} ${progress}%`}
            </span>
            {phase === "uploading" ? (
              <button
                type="button"
                onClick={() => request.current?.abort()}
                className="inline-flex items-center gap-1 text-ink-400 transition-colors hover:text-ink-100"
              >
                <X className="size-3.5" />
                {copy.cancel}
              </button>
            ) : null}
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={cn(
                "h-full rounded-full bg-linear-to-r from-brand-400 to-brand-600 transition-[width] duration-200",
                phase !== "uploading" && "animate-pulse",
              )}
              style={{ width: phase === "uploading" ? `${progress}%` : "100%" }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="flex items-start gap-2 text-[13px] text-rose-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Hint>{copy.hint}</Hint>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-mono text-ink-300">{value}</dd>
    </div>
  );
}

function StatusLine({
  status,
  copy,
}: {
  status: UploaderAsset["status"];
  copy: ExercisesDictionary["video"];
}) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-300">
        <CheckCircle2 className="size-4" />
        {copy.ready}
      </span>
    );
  }

  if (status === "errored") {
    return <Chip tone="warn">{copy.errored}</Chip>;
  }

  return <Chip tone="warn">{status === "processing" ? copy.processing : copy.uploading}</Chip>;
}

/* ------------------------------------------------------------------ upload */

/**
 * PUT to a Supabase signed upload URL, shaped exactly the way supabase-js
 * shapes it. We do it by hand rather than calling `uploadToSignedUrl` because
 * fetch gives no upload progress and XHR does — and for a 50 MB file over a
 * phone connection, a progress bar is the difference between "working" and
 * "frozen".
 */
function put(
  target: UploadTarget,
  body: Blob,
  contentType: string,
  onProgress?: (percent: number) => void,
  handle?: { current: XMLHttpRequest | null },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (handle) handle.current = xhr;

    xhr.open("PUT", target.uploadUrl, true);

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`storage responded ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));

    // The token rides in the URL, so no auth header. cacheControl is the field
    // Storage reads off the multipart body; the file must be the empty-named
    // part — that is what the signed upload endpoint expects.
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append("", new File([body], target.path.split("/").pop() ?? "file", {
      type: contentType,
    }));

    xhr.send(form);
  });
}

/* ------------------------------------------------------------------- probe */

type Probe = {
  durationSec: number | null;
  width: number | null;
  height: number | null;
  poster: Blob | null;
};

/**
 * Reads duration and dimensions off the file and grabs a poster frame.
 *
 * Everything here is best effort. A codec the browser cannot decode — an
 * HEVC .mov from an iPhone is the usual one — still uploads fine and simply
 * arrives without a duration or a poster.
 */
async function probeVideo(file: File): Promise<Probe> {
  const empty: Probe = { durationSec: null, width: null, height: null, poster: null };
  if (typeof document === "undefined") return empty;

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  // Same-origin blob URL, but canvas taint rules still want this set.
  video.crossOrigin = "anonymous";
  video.src = url;

  try {
    await once(video, "loadedmetadata", 8000);

    const probe: Probe = {
      durationSec: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
      width: video.videoWidth || null,
      height: video.videoHeight || null,
      poster: null,
    };

    // A frame from the very start is often a title card or an empty gym floor.
    video.currentTime = Math.min(1, (video.duration || 2) / 2);
    await once(video, "seeked", 8000);

    probe.poster = await capture(video);
    return probe;
  } catch {
    return empty;
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

function once(target: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`timed out waiting for ${event}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      target.removeEventListener(event, onEvent);
      target.removeEventListener("error", onError);
    }
    function onEvent() {
      cleanup();
      resolve();
    }
    function onError() {
      cleanup();
      reject(new Error(`the browser could not decode this file`));
    }

    target.addEventListener(event, onEvent, { once: true });
    target.addEventListener("error", onError, { once: true });
  });
}

async function capture(video: HTMLVideoElement): Promise<Blob | null> {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  // Capped: the poster is a 32-wide thumbnail in the list and a placeholder in
  // the player. A full-resolution JPEG of every exercise is wasted bandwidth.
  const scale = Math.min(1, 640 / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.72),
  );
}

/**
 * Some browsers hand over an empty or generic `type` for .mov and .webm files
 * picked from a phone gallery. The extension is the fallback, and the server
 * validates the result again either way.
 */
function resolveMimeType(file: File): string {
  if (isVideoMimeType(file.type)) return file.type;

  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  if (extension === "mp4" || extension === "m4v") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";

  return file.type;
}
