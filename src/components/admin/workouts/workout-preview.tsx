"use client";

import { Repeat, Timer } from "lucide-react";

import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { Locale } from "@/lib/i18n/config";
import type { MetricKind } from "@/lib/taxonomy/config";
import { formatDuration, type SectionKind } from "@/lib/workouts/config";
import { sectionSec, totalSets, type FactsLookup } from "@/lib/workouts/estimate";
import type { ExerciseOption } from "@/lib/workouts/queries";
import type { DraftItemInput, DraftSectionInput } from "@/lib/workouts/types";
import { cn } from "@/lib/utils";

export type WorkoutPreviewCopy = {
  title: string;
  subtitle: string;
  empty: string;
  rounds: string;
  round: string;
  rest: string;
  restRounds: string;
  restAfter: string;
  sets: string;
  perSide: string;
  rpe: string;
  tempo: string;
  missingExercise: string;
  kinds: Record<SectionKind, string>;
};

/**
 * The session as the client will meet it, rendered from the same draft the
 * form above is editing.
 *
 * It is not a nicety. A builder shows fields; this shows the *shape* — that
 * the warm-up is longer than the work, that block B is eleven minutes of
 * standing around, that a line has no rest between sets. Those are visible in
 * two seconds here and invisible in a column of inputs.
 */
export function WorkoutPreview({
  sections,
  byId,
  lookup,
  lang,
  copy,
  metricLabels,
}: {
  sections: readonly DraftSectionInput[];
  byId: Map<string, ExerciseOption>;
  lookup: FactsLookup;
  lang: Locale;
  copy: WorkoutPreviewCopy;
  metricLabels: Record<MetricKind, string>;
}) {
  const filled = sections.filter((section) => section.items.length > 0);

  return (
    <Surface tone="bare" className="flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-100">{copy.title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{copy.subtitle}</p>
      </div>

      {filled.length === 0 ? (
        <p className="rounded-control border border-dashed border-white/10 px-4 py-8 text-center text-[13px] text-ink-500">
          {copy.empty}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {filled.map((section, index) => (
            <li key={index}>
              <SectionCard
                section={section}
                byId={byId}
                lookup={lookup}
                lang={lang}
                copy={copy}
                metricLabels={metricLabels}
              />
            </li>
          ))}
        </ol>
      )}
    </Surface>
  );
}

const KIND_TONE: Record<SectionKind, string> = {
  warmup: "border-warn/25 bg-warn/8 text-warn",
  main: "border-brand-500/25 bg-brand-500/12 text-brand-200",
  cooldown: "border-glow/25 bg-glow/8 text-glow",
};

function SectionCard({
  section,
  byId,
  lookup,
  lang,
  copy,
  metricLabels,
}: {
  section: DraftSectionInput;
  byId: Map<string, ExerciseOption>;
  lookup: FactsLookup;
  lang: Locale;
  copy: WorkoutPreviewCopy;
  metricLabels: Record<MetricKind, string>;
}) {
  const label = translate(section.title, lang) || copy.kinds[section.kind];
  const circuit = section.rounds > 1;

  return (
    <div className="rounded-control border border-white/8 bg-white/2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
            KIND_TONE[section.kind],
          )}
        >
          {copy.kinds[section.kind]}
        </span>

        <span className="text-[14px] font-semibold text-ink-100">{label}</span>

        {circuit ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ink-300">
            <Repeat className="size-3.5" />
            {section.rounds} {copy.rounds}
          </span>
        ) : null}

        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[12px] text-ink-400">
          <Timer className="size-3.5" />
          {formatDuration(sectionSec(section, lookup))}
        </span>
      </div>

      <ol className="mt-3 flex flex-col gap-1.5">
        {section.items.map((item, index) => (
          <li key={index}>
            <ItemLine
              item={item}
              index={index}
              rounds={section.rounds}
              exercise={byId.get(item.exerciseId)}
              lang={lang}
              copy={copy}
              metricLabels={metricLabels}
            />
          </li>
        ))}
      </ol>

      {(section.rounds > 1 && section.restBetweenRoundsSec > 0) ||
      section.restAfterSec > 0 ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/6 pt-2.5 text-[11px] text-ink-500">
          {section.rounds > 1 && section.restBetweenRoundsSec > 0 ? (
            <span>
              {copy.restRounds}: {formatDuration(section.restBetweenRoundsSec)}
            </span>
          ) : null}
          {section.restAfterSec > 0 ? (
            <span>
              {copy.restAfter}: {formatDuration(section.restAfterSec)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ItemLine({
  item,
  index,
  rounds,
  exercise,
  lang,
  copy,
  metricLabels,
}: {
  item: DraftItemInput;
  index: number;
  rounds: number;
  exercise: ExerciseOption | undefined;
  lang: Locale;
  copy: WorkoutPreviewCopy;
  metricLabels: Record<MetricKind, string>;
}) {
  const name = exercise ? translate(exercise.title, lang) : copy.missingExercise;

  const prescription =
    item.mode === "time"
      ? `${totalSets(item, rounds)} × ${formatDuration(item.durationSec ?? 0)}`
      : `${totalSets(item, rounds)} × ${item.reps ?? 0}`;

  const chips: string[] = [];
  if (exercise?.isUnilateral) chips.push(copy.perSide);
  if (item.rpe !== null) chips.push(`${copy.rpe} ${item.rpe}`);
  if (item.tempo) chips.push(`${copy.tempo} ${item.tempo}`);
  for (const [metric, value] of Object.entries(item.metrics)) {
    if (value) chips.push(`${metricLabels[metric as MetricKind]} ${value}`);
  }
  if (item.restSec > 0) chips.push(`${copy.rest} ${formatDuration(item.restSec)}`);

  const note = translate(item.note, lang);

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 w-4 shrink-0 text-right font-mono text-[11px] text-ink-500">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span
            className={cn(
              "text-[13px] font-medium",
              exercise ? "text-ink-100" : "text-danger",
            )}
          >
            {name}
          </span>
          <span className="font-mono text-[12px] text-brand-300">{prescription}</span>
        </div>

        {chips.length ? (
          <p className="mt-0.5 text-[11px] text-ink-500">{chips.join(" · ")}</p>
        ) : null}

        {note ? (
          <p className="mt-0.5 text-[11px] italic text-ink-400">“{note}”</p>
        ) : null}
      </div>
    </div>
  );
}
