"use client";

import { Dumbbell } from "lucide-react";

/**
 * The demonstration clip for the current exercise.
 *
 * Muted, looping and inline: it is a reference you glance at between reps, not
 * something you sit and watch. `playsInline` is what keeps iOS from throwing
 * it into the fullscreen player and taking the whole runner off screen.
 *
 * The src arrives already signed — `RunnerItem.videoUrl` is resolved by the
 * source, so this component never learns which provider the bytes came from.
 * Until the library has videos in it (feature 06), the placeholder is what
 * shows, and it says why.
 */
export function RunnerVideo({
  src,
  poster,
  title,
  emptyLabel,
}: {
  src: string | null;
  poster: string | null;
  title: string;
  emptyLabel: string;
}) {
  if (!src) {
    return (
      <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-white/6 bg-base-850">
        <div
          aria-hidden
          className="absolute -inset-24 animate-drift bg-[radial-gradient(circle_at_30%_30%,rgb(46_107_255/0.22),transparent_55%)]"
        />
        <div className="relative flex flex-col items-center gap-2 px-6 text-center">
          <Dumbbell className="size-7 text-ink-500" />
          <p className="text-[12px] leading-relaxed text-ink-500">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <video
      // Keyed by src upstream, so switching exercises loads the new clip
      // instead of keeping the old frame on screen.
      src={src}
      poster={poster ?? undefined}
      aria-label={title}
      className="aspect-video w-full rounded-card border border-white/6 bg-black object-cover"
      autoPlay
      muted
      loop
      playsInline
      controls={false}
      preload="metadata"
    />
  );
}
