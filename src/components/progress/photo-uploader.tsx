"use client";

import { AlertTriangle, Camera, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import type { PhotoPose } from "@/db/schema/progress";
import { confirmPhotoAction, createPhotoTicketAction } from "@/lib/progress/actions";
import type { ProgressCopy } from "@/lib/progress/copy";
import {
  MAX_PHOTO_BYTES,
  PHOTO_POSES,
  isPhotoMimeType,
} from "@/lib/progress/photos";
import { cn } from "@/lib/utils";

/**
 * Add a progress photo.
 *
 * The bytes go straight from the browser to Storage over a signed URL and never
 * pass through a Server Action — the same arrangement exercise videos have, for
 * the same two reasons: a real progress bar needs `XMLHttpRequest`, and a 10 MB
 * body through a Server Action is function time spent forwarding a file.
 *
 * The date and the angle are picked *before* the file, and that ordering is on
 * purpose. They are what makes a photo comparable to another one; a flow that
 * asks for them afterwards ends up with a gallery of undated shots from
 * whatever angle the room allowed.
 */

type Phase = "idle" | "preparing" | "uploading" | "finishing";

export function PhotoUploader({
  today,
  copy,
}: {
  today: string;
  copy: ProgressCopy;
}) {
  const [pose, setPose] = useState<PhotoPose>("front");
  const [day, setDay] = useState(today);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<XMLHttpRequest | null>(null);

  const busy = phase !== "idle";

  async function handleFile(file: File) {
    setError(null);

    const mimeType = file.type;
    if (!isPhotoMimeType(mimeType)) return setError(copy.photos.wrongType);
    if (file.size > MAX_PHOTO_BYTES) return setError(copy.photos.tooLarge);

    setPhase("preparing");
    setProgress(0);

    // The browser already has the file, so its dimensions cost nothing here.
    // Best effort: a photo the browser cannot decode still uploads and simply
    // arrives without them.
    const size = await probeImage(file);

    const ticket = await createPhotoTicketAction({
      mimeType,
      sizeBytes: file.size,
    });

    if (!ticket.ok) {
      setPhase("idle");
      return setError(copy.errors[ticket.code]);
    }

    try {
      setPhase("uploading");
      await put(ticket.ticket.uploadUrl, ticket.ticket.path, file, mimeType, setProgress, request);

      setPhase("finishing");
      const confirmed = await confirmPhotoAction({
        photoId: ticket.ticket.photoId,
        takenOn: day,
        pose,
        mimeType,
        sizeBytes: file.size,
        width: size.width,
        height: size.height,
      });

      if (!confirmed.ok) {
        setPhase("idle");
        return setError(copy.errors[confirmed.code]);
      }

      // The row is written and `refresh()` has already been called on the
      // server, so the gallery below re-renders on its own. Nothing to do here
      // but let go of the file.
      setPhase("idle");
      setProgress(0);
      if (fileInput.current) fileInput.current.value = "";
    } catch (cause) {
      setPhase("idle");
      setProgress(0);
      if (cause instanceof DOMException && cause.name === "AbortError") return;

      console.error("photo upload failed", cause);
      setError(copy.errors.upload_failed);
    }
  }

  return (
    <Surface tone="strong" edge className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.photos.uploadTitle}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {copy.photos.day}
          </span>
          <input
            type="date"
            value={day}
            max={today}
            disabled={busy}
            onChange={(event) => setDay(event.target.value)}
            className={fieldControl}
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {copy.photos.pose}
          </span>
          <div className="flex gap-1.5">
            {PHOTO_POSES.map((key) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => setPose(key)}
                aria-pressed={key === pose}
                className={cn(
                  "h-12 flex-1 rounded-control border text-[13px] font-semibold transition-colors",
                  key === pose
                    ? "border-brand-500/40 bg-brand-500/15 text-brand-100"
                    : "border-white/10 bg-white/4 text-ink-300 hover:border-white/16 hover:text-ink-100",
                )}
              >
                {copy.poses[key]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        // `capture` is deliberately absent: on a phone the file picker still
        // offers the camera, and forcing it would take away the shot somebody
        // already has in their gallery.
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? <Upload className="size-4" /> : <Camera className="size-4" />}
          {copy.photos.choose}
        </Button>

        <p className="text-[12px] text-ink-500">{copy.photos.slotNote}</p>
      </div>

      {busy ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px] text-ink-400">
            <span>
              {phase === "preparing"
                ? copy.photos.preparing
                : phase === "finishing"
                  ? copy.photos.finishing
                  : `${copy.photos.uploading} ${progress}%`}
            </span>
            {phase === "uploading" ? (
              <button
                type="button"
                onClick={() => request.current?.abort()}
                className="inline-flex items-center gap-1 text-ink-400 transition-colors hover:text-ink-100"
              >
                <X className="size-3.5" />
                {copy.photos.cancel}
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
        <p role="alert" className="flex items-start gap-2 text-[13px] text-rose-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <p className="text-[12px] text-ink-500">{copy.photos.hint}</p>
    </Surface>
  );
}

/* ------------------------------------------------------------------ upload */

/**
 * PUT to a Supabase signed upload URL, shaped exactly the way supabase-js
 * shapes it.
 *
 * Done by hand rather than through `uploadToSignedUrl` because `fetch` gives no
 * upload progress and XHR does — the same call `components/admin/exercises/
 * video-uploader.tsx` makes, repeated rather than shared because the two live
 * on opposite sides of the app and a common upload module would be a shared
 * file for the sake of thirty lines.
 */
function put(
  uploadUrl: string,
  path: string,
  body: Blob,
  contentType: string,
  onProgress: (percent: number) => void,
  handle: { current: XMLHttpRequest | null },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    handle.current = xhr;

    xhr.open("PUT", uploadUrl, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`storage responded ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.onabort = () => reject(new DOMException("aborted", "AbortError"));

    // The token rides in the URL, so no auth header. The file must be the
    // empty-named part — that is what the signed upload endpoint expects.
    const form = new FormData();
    form.append("cacheControl", "3600");
    form.append(
      "",
      new File([body], path.split("/").pop() ?? "photo", { type: contentType }),
    );

    xhr.send(form);
  });
}

/** Dimensions, best effort. A photo without them still uploads. */
function probeImage(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve({ width: null, height: null });

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth || null, height: image.naturalHeight || null });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: null, height: null });
    };

    image.src = url;
  });
}
