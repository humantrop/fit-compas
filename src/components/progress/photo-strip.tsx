import { ImageOff } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import type { ProgressCopy } from "@/lib/progress/copy";
import type { PhotoView } from "@/lib/progress/types";

/**
 * The newest photo of each angle.
 *
 * Three at most, and only ever the latest — the gallery is a click away and
 * this is the overview. What it is really for is the reminder: a strip showing
 * a front shot from April is the most direct way of saying it has been a while.
 */
export function PhotoStrip({
  photos,
  lang,
  localeTag,
  copy,
}: {
  photos: PhotoView[];
  lang: string;
  localeTag: string;
  copy: ProgressCopy;
}) {
  return (
    <Surface className="flex flex-col gap-4 p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-ink-200">
          {copy.overview.photosTitle}
        </h2>
        {photos.length > 0 ? (
          <Link
            href={`/${lang}/progress/photos`}
            className="text-[12px] font-semibold text-brand-200 transition-colors hover:text-brand-100"
          >
            {copy.overview.seeAll}
          </Link>
        ) : null}
      </header>

      {photos.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-[13px] text-ink-400">{copy.overview.photosEmpty}</p>
          <ButtonLink
            href={`/${lang}/progress/photos`}
            variant="secondary"
            size="sm"
          >
            {copy.overview.photosAction}
          </ButtonLink>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <li key={photo.id} className="flex flex-col gap-1.5">
              <PhotoFrame photo={photo} copy={copy} />
              <p className="text-[11px] font-semibold text-ink-300">
                {copy.poses[photo.pose]}
              </p>
              <p className="text-[11px] text-ink-500">
                {formatDayLong(photo.takenOn, localeTag)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}

/**
 * One photo in its frame.
 *
 * Exported because the gallery and the comparison show the same thing and a
 * second copy of "what a progress photo looks like when its URL failed to sign"
 * is a second thing to keep consistent.
 *
 * Not `next/image`: the URL is signed and expires within the hour, so the image
 * optimiser would cache a link that stops working — and the bucket host would
 * need a remote pattern in `next.config.ts`, a shared file this feature stays
 * out of while parallel sessions are running.
 */
export function PhotoFrame({
  photo,
  copy,
  className,
}: {
  photo: PhotoView;
  copy: ProgressCopy;
  className?: string;
}) {
  return (
    <div
      className={
        className ??
        "aspect-[3/4] overflow-hidden rounded-control border border-white/8 bg-base-900"
      }
    >
      {photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt=""
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center gap-2 text-ink-600">
          <ImageOff className="size-5" />
          <span className="px-2 text-center text-[10px] text-ink-500">
            {copy.photos.missing}
          </span>
        </div>
      )}
    </div>
  );
}
