"use client";

import { Dumbbell, Play } from "lucide-react";
import { useRef, useState } from "react";

/**
 * The demonstration clip for the current exercise.
 *
 * Muted, looping and inline: it is a reference you glance at between reps, not
 * something you sit and watch. `playsInline` is what keeps iOS from throwing
 * it into the fullscreen player and taking the whole runner off screen.
 *
 * It loops until one of two things happens: the user taps it, which pauses it
 * (and taps again to resume), or the runner moves to another exercise, which
 * changes the `key` upstream and unmounts this element. No native controls —
 * a scrub bar is a target a sweaty thumb hits by accident — so the whole clip
 * is the button. The paused state comes from the element's own events rather
 * than from the tap, so a clip that low-power mode refused to autoplay shows
 * the play mark too.
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
  pauseLabel,
  playLabel,
}: {
  src: string | null;
  poster: string | null;
  title: string;
  emptyLabel: string;
  pauseLabel: string;
  playLabel: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

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

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      // play() rejects when the browser still says no; the overlay stays up.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${paused ? playLabel : pauseLabel}: ${title}`}
      className="relative block w-full overflow-hidden rounded-card border border-white/6 bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow"
    >
      <video
        ref={ref}
        // Keyed by src upstream, so switching exercises loads the new clip
        // instead of keeping the old frame on screen.
        src={src}
        poster={poster ?? undefined}
        className="aspect-video w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        controls={false}
        preload="metadata"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      {paused ? (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-black/35"
        >
          <span className="grid size-14 place-items-center rounded-full border border-brand-400/35 bg-brand-500/30 text-brand-100 backdrop-blur-sm">
            <Play className="size-5 translate-x-px fill-current" />
          </span>
        </span>
      ) : null}
    </button>
  );
}
