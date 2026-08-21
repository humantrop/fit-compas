"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import type { PhotoPose } from "@/db/schema/progress";
import { formatDayLong } from "@/lib/clients/format";
import { daysBetween } from "@/lib/clients/schedule";
import { plural, type ProgressCopy } from "@/lib/progress/copy";
import { PHOTO_POSES } from "@/lib/progress/photos";
import type { PhotoView } from "@/lib/progress/types";
import { cn } from "@/lib/utils";

import { PhotoFrame } from "./photo-strip";

/**
 * Two photos of the same angle, side by side.
 *
 * The whole feature is the constraint: one angle, two dates. Comparing a front
 * shot against a side shot is what a gallery already lets anyone do, and it
 * shows nothing — so the angle is picked once and the two dates are chosen
 * within it.
 *
 * The choice lives in the query string, like every other view state in this app
 * (the library's filters, the plan's month), so a comparison is a link somebody
 * can send to their coach. This component is a client one only because a
 * `<select>` has to navigate on change; the photos it puts on screen were
 * rendered and signed on the server.
 */
export function PhotoCompare({
  basePath,
  photos,
  pose,
  from,
  to,
  localeTag,
  copy,
}: {
  basePath: string;
  /** Every photo the reader has, all angles — the picker slices it itself. */
  photos: PhotoView[];
  pose: PhotoPose;
  from: PhotoView | null;
  to: PhotoView | null;
  localeTag: string;
  copy: ProgressCopy;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const inPose = photos.filter((photo) => photo.pose === pose);

  function go(next: { p?: PhotoPose; a?: string; b?: string }) {
    const params = new URLSearchParams();
    params.set("p", next.p ?? pose);
    // Switching angle drops the two dates: the ids belonged to the old angle,
    // and carrying them over would ask for photos that are not in this set.
    if (!next.p) {
      const a = next.a ?? from?.id;
      const b = next.b ?? to?.id;
      if (a) params.set("a", a);
      if (b) params.set("b", b);
    }

    startTransition(() => {
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    });
  }

  const apart =
    from && to ? Math.abs(daysBetween(from.takenOn, to.takenOn)) : null;

  return (
    <Surface tone="strong" edge className="flex flex-col gap-4 p-5 sm:p-6">
      <header>
        <h2 className="text-[13px] font-semibold text-ink-200">
          {copy.photos.compareTitle}
        </h2>
        <p className="mt-1 text-[12px] text-ink-500">{copy.photos.compareHint}</p>
      </header>

      <div className="flex gap-1.5">
        {PHOTO_POSES.map((key) => {
          const count = photos.filter((photo) => photo.pose === key).length;

          return (
            <button
              key={key}
              type="button"
              onClick={() => go({ p: key })}
              aria-pressed={key === pose}
              className={cn(
                "h-10 flex-1 rounded-control border text-[13px] font-semibold transition-colors",
                key === pose
                  ? "border-brand-500/40 bg-brand-500/15 text-brand-100"
                  : "border-white/10 bg-white/4 text-ink-300 hover:border-white/16 hover:text-ink-100",
              )}
            >
              {copy.poses[key]}
              <span className="ml-1.5 text-[11px] font-normal text-ink-500">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {inPose.length < 2 ? (
        <p className="text-[13px] text-ink-400">{copy.photos.compareEmpty}</p>
      ) : (
        <>
          <div className={cn("grid gap-3 sm:grid-cols-2", pending && "opacity-60")}>
            <Side
              label={copy.photos.compareFrom}
              photo={from}
              options={inPose}
              localeTag={localeTag}
              copy={copy}
              onPick={(id) => go({ a: id })}
            />
            <Side
              label={copy.photos.compareTo}
              photo={to}
              options={inPose}
              localeTag={localeTag}
              copy={copy}
              onPick={(id) => go({ b: id })}
            />
          </div>

          {apart !== null ? (
            <p className="text-center text-[12px] font-semibold text-ink-400">
              {plural(copy.photos.apart, apart, localeTag)}
            </p>
          ) : null}
        </>
      )}
    </Surface>
  );
}

function Side({
  label,
  photo,
  options,
  localeTag,
  copy,
  onPick,
}: {
  label: string;
  photo: PhotoView | null;
  options: PhotoView[];
  localeTag: string;
  copy: ProgressCopy;
  onPick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          {label}
        </span>
        <select
          value={photo?.id ?? ""}
          onChange={(event) => onPick(event.target.value)}
          className={cn(fieldControl, "h-10 text-[13px]")}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-base-900">
              {formatDayLong(option.takenOn, localeTag)}
            </option>
          ))}
        </select>
      </label>

      {photo ? <PhotoFrame photo={photo} copy={copy} /> : null}
    </div>
  );
}
