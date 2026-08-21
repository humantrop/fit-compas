import { Dumbbell, Play, Repeat2, Timer } from "lucide-react";
import Link from "next/link";

import { Surface } from "@/components/ui/surface";
import { plural, type LibraryCopy } from "@/lib/library/copy";
import type { LibraryItem, LibraryTag } from "@/lib/library/types";

import { DifficultyMeter } from "./difficulty-meter";

/** mm:ss — every clip in the library is a demo, so hours never come up. */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Equipment first, then the primary movers: that is the order people scan in. */
function cardTags(item: LibraryItem): LibraryTag[] {
  return [...item.equipment, ...item.muscles];
}

export function LibraryCard({
  item,
  href,
  copy,
  localeTag,
}: {
  item: LibraryItem;
  href: string;
  copy: LibraryCopy;
  localeTag: string;
}) {
  const tags = cardTags(item);
  const shown = tags.slice(0, 3);
  const overflow = tags.length - shown.length;

  return (
    <Surface
      as={Link}
      href={href}
      className="group flex flex-col transition-colors hover:border-white/16"
    >
      {/* Posters arrive with feature 06, which owns the storage URLs. Until
          then the tile carries the state that matters: is there a video. */}
      <div className="relative grid h-28 place-items-center border-b border-white/6 bg-linear-to-br from-brand-500/14 via-transparent to-glow/10">
        {item.hasVideo ? (
          <span className="grid size-11 place-items-center rounded-full border border-brand-400/40 bg-brand-500/20 text-brand-100 transition-transform group-hover:scale-105">
            <Play className="size-4.5 translate-x-px fill-current" />
          </span>
        ) : (
          <Dumbbell className="size-6 text-ink-500" />
        )}

        {item.durationSec ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-void/70 px-2 py-0.5 font-mono text-[11px] text-ink-200">
            {formatDuration(item.durationSec)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-[15px] font-semibold text-ink-50">{item.title}</h3>
          {item.summary ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-400">
              {item.summary}
            </p>
          ) : null}
        </div>

        {shown.length ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((tag) => (
              <span
                key={tag.slug}
                className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[11px] text-ink-300"
              >
                {tag.label}
              </span>
            ))}
            {overflow > 0 ? (
              <span className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-ink-500">
                {plural(copy.card.more, overflow, localeTag)}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <DifficultyMeter
            level={item.difficulty}
            label={copy.difficulty[item.difficulty]}
          />

          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-500">
            {item.mode === "time" ? (
              <Timer className="size-3.5" />
            ) : (
              <Repeat2 className="size-3.5" />
            )}
            {item.mode === "time" ? copy.card.time : copy.card.reps}
          </span>
        </div>
      </div>
    </Surface>
  );
}
