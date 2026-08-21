import { AlertTriangle, Film, Repeat, Timer } from "lucide-react";
import Link from "next/link";

import { Chip, formatDuration } from "@/components/admin/exercises/ui";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { ExerciseListItem } from "@/lib/exercises/queries";
import type { Locale } from "@/lib/i18n/config";
import type { ExercisesDictionary } from "@/lib/i18n/exercises-dictionary";
import { cn } from "@/lib/utils";

/** Chips beyond this just wrap into a second line of noise. */
const MAX_CHIPS = 3;

export function ExerciseCard({
  exercise,
  lang,
  copy,
}: {
  exercise: ExerciseListItem;
  lang: Locale;
  copy: ExercisesDictionary;
}) {
  const title = translate(exercise.title, lang) || copy.list.noTitle;
  const chips = [...exercise.muscles, ...exercise.equipment].slice(0, MAX_CHIPS);
  const extra = exercise.muscles.length + exercise.equipment.length - chips.length;

  const needsAttention =
    exercise.video !== null && exercise.video.status !== "ready";

  return (
    <Surface
      as={Link}
      href={`/${lang}/admin/exercises/${exercise.id}`}
      className="group flex gap-4 p-3 transition-colors hover:border-white/16"
    >
      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-control border border-white/8 bg-base-900 sm:w-36">
        {exercise.video?.thumbnailUrl ? (
          // Not next/image: the poster lives on Supabase Storage and adding a
          // remote pattern to next.config is a shared-file edit this feature
          // deliberately stays out of while 05–08 run in parallel.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={exercise.video.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="grid size-full place-items-center text-ink-600">
            <Film className="size-5" />
          </div>
        )}

        {exercise.video?.durationSec ? (
          <span className="absolute bottom-1 right-1 rounded bg-void/70 px-1.5 py-0.5 font-mono text-[10px] text-ink-200">
            {formatDuration(exercise.video.durationSec)}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[15px] font-semibold text-ink-100">{title}</h3>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
              exercise.isPublished
                ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-ink-400",
            )}
          >
            {exercise.isPublished ? copy.status.published : copy.status.draft}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="brand">{copy.difficulty[exercise.difficulty]}</Chip>
          <Chip>
            {exercise.defaultMode === "time" ? (
              <Timer className="size-3" />
            ) : (
              <Repeat className="size-3" />
            )}
            {exercise.defaultMode === "time" ? copy.mode.time : copy.mode.reps}
          </Chip>
          {needsAttention ? (
            <Chip tone="warn">
              <AlertTriangle className="size-3" />
              {exercise.video?.status === "errored"
                ? copy.video.errored
                : copy.video.uploading}
            </Chip>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {chips.length ? (
            chips.map((name, index) => (
              <Chip key={`${index}-${translate(name, lang)}`}>
                {translate(name, lang)}
              </Chip>
            ))
          ) : (
            <span className="text-[12px] text-ink-600">{copy.list.noTags}</span>
          )}
          {extra > 0 ? <span className="text-[12px] text-ink-500">+{extra}</span> : null}
        </div>
      </div>
    </Surface>
  );
}
