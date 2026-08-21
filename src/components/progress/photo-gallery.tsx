import { Surface } from "@/components/ui/surface";
import { formatDayLong } from "@/lib/clients/format";
import type { ProgressCopy } from "@/lib/progress/copy";
import type { PhotoView } from "@/lib/progress/types";

import { PhotoFrame } from "./photo-strip";
import { PhotoRemove } from "./photo-remove";

/**
 * Every photo, newest first, grouped by the day it was taken.
 *
 * Grouped rather than a flat grid because the unit somebody thinks in is the
 * session: "the three I took in June". A flat grid sorted by date puts front,
 * side and back next to each other anyway and then makes the reader work out
 * where one day ends and the next begins.
 */
export function PhotoGallery({
  photos,
  localeTag,
  copy,
}: {
  photos: PhotoView[];
  localeTag: string;
  copy: ProgressCopy;
}) {
  // Already ordered by day descending out of the query; this only walks the
  // list and starts a new group when the day changes, so the order the
  // database chose is the order on screen.
  const groups: { day: string; photos: PhotoView[] }[] = [];
  for (const photo of photos) {
    const last = groups[groups.length - 1];
    if (last && last.day === photo.takenOn) last.photos.push(photo);
    else groups.push({ day: photo.takenOn, photos: [photo] });
  }

  return (
    <Surface className="flex flex-col gap-5 p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold text-ink-200">
        {copy.photos.galleryTitle}
      </h2>

      {groups.length === 0 ? (
        <p className="text-[13px] text-ink-400">{copy.photos.galleryEmpty}</p>
      ) : (
        groups.map((group) => (
          <section key={group.day} className="flex flex-col gap-2.5">
            <h3 className="text-[12px] font-semibold text-ink-400">
              {formatDayLong(group.day, localeTag)}
            </h3>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {group.photos.map((photo) => (
                <li key={photo.id} className="relative">
                  <PhotoFrame photo={photo} copy={copy} />

                  <span className="absolute left-2 top-2 rounded-full bg-void/65 px-2.5 py-1 text-[11px] font-semibold text-ink-100 backdrop-blur-sm">
                    {copy.poses[photo.pose]}
                  </span>

                  <span className="absolute right-2 top-2">
                    <PhotoRemove photoId={photo.id} copy={copy} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Surface>
  );
}
