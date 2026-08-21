"use client";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Hash,
  Layers,
  ListChecks,
  Plus,
  Timer,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  ExercisePicker,
  type ExercisePickerCopy,
} from "@/components/admin/workouts/exercise-picker";
import {
  WorkoutPreview,
  type WorkoutPreviewCopy,
} from "@/components/admin/workouts/workout-preview";
import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate, type Translated } from "@/db/schema/i18n";
import { localeShort, locales, type Locale } from "@/lib/i18n/config";
import type { MetricKind } from "@/lib/taxonomy/config";
import {
  LIMITS,
  REST_PRESETS,
  SECTION_KINDS,
  clamp,
  formatDuration,
  type SectionKind,
  type SetMode,
} from "@/lib/workouts/config";
import {
  deleteWorkoutAction,
  saveWorkoutAction,
  setWorkoutPublishedAction,
} from "@/lib/workouts/actions";
import { sectionSec, workoutTotals, type FactsLookup } from "@/lib/workouts/estimate";
import type { ExerciseOption, TagOption } from "@/lib/workouts/queries";
import {
  DIFFICULTIES,
  type Difficulty,
  type DraftItemInput,
  type DraftSectionInput,
  type WorkoutDraftInput,
  type WorkoutErrorCopy,
  type WorkoutErrorCode,
} from "@/lib/workouts/types";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- the copy */

export type WorkoutBuilderCopy = {
  back: string;
  contentLanguage: string;
  contentLanguageHint: string;
  titleLabel: string;
  slug: string;
  slugLocked: string;
  description: string;
  difficulty: string;
  goals: string;
  activities: string;
  noTags: string;
  save: string;
  saving: string;
  saved: string;
  unsaved: string;
  publish: string;
  unpublish: string;
  publishedBadge: string;
  draftBadge: string;
  remove: string;
  removeConfirm: string;
  duration: string;
  sections: string;
  exercises: string;
  setsTotal: string;
  addSection: string;
  addExercise: string;
  emptySection: string;
  noSections: string;
  noSectionsHint: string;
  sectionTitle: string;
  sectionTitlePlaceholder: string;
  rounds: string;
  roundsHint: string;
  restBetweenRounds: string;
  restAfter: string;
  removeSection: string;
  moveUp: string;
  moveDown: string;
  mode: string;
  modeReps: string;
  modeTime: string;
  sets: string;
  reps: string;
  durationField: string;
  rest: string;
  rpe: string;
  tempo: string;
  tempoPlaceholder: string;
  note: string;
  notePlaceholder: string;
  removeItem: string;
  metricsLabel: string;
  seconds: string;
  kinds: Record<SectionKind, string>;
  difficulties: Record<Difficulty, string>;
};

/* ------------------------------------------------------- editable draft */

/**
 * The draft carries a client-only `key` per row.
 *
 * React needs a stable identity for a list that reorders, and the database ids
 * cannot provide one: the save replaces every section and item wholesale, so
 * an id would change under the cursor on every save.
 */
type EditableItem = DraftItemInput & { key: string };
type EditableSection = Omit<DraftSectionInput, "items"> & {
  key: string;
  items: EditableItem[];
};

const REST_PRESETS_ID = "fc-rest-presets";

let keySeed = 0;
function newKey(): string {
  keySeed += 1;
  return `k${keySeed}-${Math.random().toString(36).slice(2, 8)}`;
}

function toDraft(
  header: Header,
  sections: EditableSection[],
  id: string,
): WorkoutDraftInput {
  return {
    id,
    title: header.title,
    description: header.description,
    difficulty: header.difficulty,
    goalIds: header.goalIds,
    activityIds: header.activityIds,
    sections: sections.map(stripSection),
  };
}

type Header = {
  title: Translated;
  description: Translated;
  difficulty: Difficulty;
  goalIds: string[];
  activityIds: string[];
};

/* ------------------------------------------------------------- component */

export function WorkoutBuilder({
  workout,
  options,
  tags,
  lang,
  copy,
  errors,
  picker,
  preview,
  metricLabels,
}: {
  workout: WorkoutDraftInput & { slug: string; isPublished: boolean };
  options: ExerciseOption[];
  tags: { goals: TagOption[]; activities: TagOption[] };
  lang: Locale;
  copy: WorkoutBuilderCopy;
  errors: WorkoutErrorCopy;
  picker: ExercisePickerCopy;
  preview: WorkoutPreviewCopy;
  metricLabels: Record<MetricKind, string>;
}) {
  const router = useRouter();

  const [contentLocale, setContentLocale] = useState<Locale>(lang);
  const [header, setHeader] = useState<Header>({
    title: workout.title,
    description: workout.description,
    difficulty: workout.difficulty,
    goalIds: workout.goalIds,
    activityIds: workout.activityIds,
  });
  const [sections, setSections] = useState<EditableSection[]>(() =>
    workout.sections.map((section) => ({
      ...section,
      key: newKey(),
      items: section.items.map((item) => ({ ...item, key: newKey() })),
    })),
  );

  const [isPublished, setIsPublished] = useState(workout.isPublished);
  const [error, setError] = useState<WorkoutErrorCode | null>(null);
  const [pending, startTransition] = useTransition();

  /** Which section the picker is adding a line to, or null while it is shut. */
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const draft = useMemo(
    () => toDraft(header, sections, workout.id),
    [header, sections, workout.id],
  );

  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(draft));
  const dirty = JSON.stringify(draft) !== savedSnapshot;

  // The whole session lives in memory until Save. Closing the tab on a
  // half-built workout without a word is the one unrecoverable mistake here.
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const byId = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const lookup = useCallback<FactsLookup>(
    (id) => {
      const option = byId.get(id);
      return option ? { isUnilateral: option.isUnilateral } : undefined;
    },
    [byId],
  );

  const totals = useMemo(
    () => workoutTotals(draft.sections, lookup),
    [draft.sections, lookup],
  );

  /* ------------------------------------------------------------ mutators */

  const patchSection = useCallback(
    (key: string, patch: Partial<EditableSection>) => {
      setSections((current) =>
        current.map((section) =>
          section.key === key ? { ...section, ...patch } : section,
        ),
      );
    },
    [],
  );

  const patchItem = useCallback(
    (sectionKey: string, itemKey: string, patch: Partial<EditableItem>) => {
      setSections((current) =>
        current.map((section) =>
          section.key === sectionKey
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.key === itemKey ? { ...item, ...patch } : item,
                ),
              }
            : section,
        ),
      );
    },
    [],
  );

  function addSection(kind: SectionKind) {
    if (sections.length >= LIMITS.sections) return;
    setSections((current) => [...current, blankSection(kind)]);
  }

  function removeSection(key: string) {
    setSections((current) => current.filter((section) => section.key !== key));
  }

  function moveSection(key: string, direction: -1 | 1) {
    setSections((current) => move(current, (s) => s.key === key, direction));
  }

  function moveItem(sectionKey: string, itemKey: string, direction: -1 | 1) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, items: move(section.items, (i) => i.key === itemKey, direction) }
          : section,
      ),
    );
  }

  function removeItem(sectionKey: string, itemKey: string) {
    setSections((current) =>
      current.map((section) =>
        section.key === sectionKey
          ? { ...section, items: section.items.filter((item) => item.key !== itemKey) }
          : section,
      ),
    );
  }

  function pickExercise(option: ExerciseOption) {
    const sectionKey = pickerFor;
    setPickerFor(null);
    if (!sectionKey) return;

    setSections((current) =>
      current.map((section) => {
        if (section.key !== sectionKey) return section;
        if (section.items.length >= LIMITS.itemsPerSection) return section;
        return { ...section, items: [...section.items, blankItem(option, section)] };
      }),
    );
  }

  /* ------------------------------------------------------------- actions */

  function save() {
    setError(null);
    startTransition(async () => {
      const state = await saveWorkoutAction(draft);
      if (state.status === "error") {
        setError(state.code ?? "unknown");
        return;
      }
      setSavedSnapshot(JSON.stringify(draft));
    });
  }

  function togglePublished() {
    setError(null);
    startTransition(async () => {
      const next = !isPublished;
      const state = await setWorkoutPublishedAction(workout.id, next);
      if (state.status === "error") {
        setError(state.code ?? "unknown");
        return;
      }
      setIsPublished(next);
    });
  }

  function remove() {
    if (!window.confirm(copy.removeConfirm)) return;
    setError(null);
    startTransition(async () => {
      const state = await deleteWorkoutAction(workout.id);
      if (state.status === "error") {
        setError(state.code ?? "unknown");
        return;
      }
      router.push(`/${lang}/admin/workouts`);
    });
  }

  /* -------------------------------------------------------------- render */

  const usedKinds = new Set(sections.map((section) => section.kind));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${lang}/admin/workouts`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-400 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="size-4" />
          {copy.back}
        </Link>

        <span
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
            isPublished
              ? "border-success/25 bg-success/10 text-success"
              : "border-white/10 text-ink-500",
          )}
        >
          {isPublished ? copy.publishedBadge : copy.draftBadge}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <ContentLocaleTabs
            value={contentLocale}
            onChange={setContentLocale}
            label={copy.contentLanguage}
          />
        </div>
      </div>

      {/* Sticky, because the number it shows is the reason to look: a block
          added at the bottom changes the session length, and scrolling back up
          to find that out breaks the loop. */}
      <div className="sticky top-16 z-20 -mx-1 px-1">
        <Surface
          tone="strong"
          edge
          className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3"
        >
          <Stat icon={Timer} label={copy.duration} value={formatDuration(totals.durationSec)} strong />
          <Stat icon={Layers} label={copy.sections} value={String(totals.sections)} />
          <Stat icon={ListChecks} label={copy.exercises} value={String(totals.items)} />
          <Stat icon={Hash} label={copy.setsTotal} value={String(totals.sets)} />

          <div className="ml-auto flex items-center gap-2">
            <span
              className={cn(
                "text-[12px]",
                dirty ? "text-warn" : "text-ink-500",
              )}
            >
              {dirty ? copy.unsaved : copy.saved}
            </span>
            <Button type="button" size="sm" onClick={save} disabled={pending || !dirty}>
              {pending ? copy.saving : copy.save}
            </Button>
          </div>
        </Surface>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
        >
          {errors[error]}
        </p>
      ) : null}

      {/* ------------------------------------------------------- header */}

      <Surface className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.titleLabel} · {localeShort[contentLocale]}
            </span>
            <input
              value={header.title[contentLocale] ?? ""}
              onChange={(event) =>
                setHeader((h) => ({
                  ...h,
                  title: setLocale(h.title, contentLocale, event.target.value),
                }))
              }
              maxLength={LIMITS.title}
              autoComplete="off"
              className={fieldControl}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">{copy.slug}</span>
            <div className="flex h-12 items-center rounded-control border border-white/8 bg-white/2 px-4">
              <code className="truncate font-mono text-[13px] text-ink-400">
                {workout.slug}
              </code>
            </div>
            <p className="text-[12px] text-ink-500">{copy.slugLocked}</p>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {copy.description} · {localeShort[contentLocale]}
          </span>
          <textarea
            value={header.description[contentLocale] ?? ""}
            onChange={(event) =>
              setHeader((h) => ({
                ...h,
                description: setLocale(h.description, contentLocale, event.target.value),
              }))
            }
            maxLength={LIMITS.description}
            rows={3}
            className={cn(fieldControl, "h-auto py-3 leading-relaxed")}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.difficulty}
            </span>
            <select
              value={header.difficulty}
              onChange={(event) =>
                setHeader((h) => ({
                  ...h,
                  difficulty: event.target.value as Difficulty,
                }))
              }
              className={cn(fieldControl, "appearance-none")}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>
                  {copy.difficulties[level]}
                </option>
              ))}
            </select>
          </label>

          <TagPicker
            label={copy.goals}
            empty={copy.noTags}
            options={tags.goals}
            selected={header.goalIds}
            lang={lang}
            onToggle={(id) =>
              setHeader((h) => ({ ...h, goalIds: toggle(h.goalIds, id) }))
            }
          />

          <TagPicker
            label={copy.activities}
            empty={copy.noTags}
            options={tags.activities}
            selected={header.activityIds}
            lang={lang}
            onToggle={(id) =>
              setHeader((h) => ({ ...h, activityIds: toggle(h.activityIds, id) }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/6 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={pending}
            className="mr-auto text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" />
            {copy.remove}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={togglePublished}
            disabled={pending}
          >
            {isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {isPublished ? copy.unpublish : copy.publish}
          </Button>
        </div>
      </Surface>

      {/* ------------------------------------------------------ sections */}

      {sections.length === 0 ? (
        <Surface tone="bare" className="px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-ink-200">{copy.noSections}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-500">
            {copy.noSectionsHint}
          </p>
        </Surface>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section, index) => (
            <SectionCard
              key={section.key}
              section={section}
              index={index}
              isFirst={index === 0}
              isLast={index === sections.length - 1}
              byId={byId}
              lookup={lookup}
              contentLocale={contentLocale}
              lang={lang}
              copy={copy}
              metricLabels={metricLabels}
              onPatch={(patch) => patchSection(section.key, patch)}
              onRemove={() => removeSection(section.key)}
              onMove={(direction) => moveSection(section.key, direction)}
              onAddExercise={() => setPickerFor(section.key)}
              onPatchItem={(itemKey, patch) => patchItem(section.key, itemKey, patch)}
              onRemoveItem={(itemKey) => removeItem(section.key, itemKey)}
              onMoveItem={(itemKey, direction) =>
                moveItem(section.key, itemKey, direction)
              }
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium text-ink-400">{copy.addSection}</span>
        {SECTION_KINDS.map((kind) => (
          <Button
            key={kind}
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addSection(kind)}
            // Warm-up and cool-down are the bookends of a session, not blocks
            // you stack — one each is the whole idea.
            disabled={
              sections.length >= LIMITS.sections ||
              (kind !== "main" && usedKinds.has(kind))
            }
          >
            <Plus className="size-4" />
            {copy.kinds[kind]}
          </Button>
        ))}
      </div>

      {/* ------------------------------------------------------- preview */}

      <WorkoutPreview
        sections={draft.sections}
        byId={byId}
        lookup={lookup}
        lang={contentLocale}
        copy={preview}
        metricLabels={metricLabels}
      />

      {/* One datalist for every rest field on the page — an id has to be
          unique, and each field rendering its own copy would break that. */}
      <datalist id={REST_PRESETS_ID}>
        {REST_PRESETS.map((preset) => (
          <option key={preset} value={preset} />
        ))}
      </datalist>

      {pickerFor ? (
        <ExercisePicker
          options={options}
          lang={lang}
          copy={picker}
          onPick={pickExercise}
          onClose={() => setPickerFor(null)}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------- the section */

function SectionCard({
  section,
  index,
  isFirst,
  isLast,
  byId,
  lookup,
  contentLocale,
  lang,
  copy,
  metricLabels,
  onPatch,
  onRemove,
  onMove,
  onAddExercise,
  onPatchItem,
  onRemoveItem,
  onMoveItem,
}: {
  section: EditableSection;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  byId: Map<string, ExerciseOption>;
  lookup: FactsLookup;
  contentLocale: Locale;
  lang: Locale;
  copy: WorkoutBuilderCopy;
  metricLabels: Record<MetricKind, string>;
  onPatch: (patch: Partial<EditableSection>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
  onAddExercise: () => void;
  onPatchItem: (itemKey: string, patch: Partial<EditableItem>) => void;
  onRemoveItem: (itemKey: string) => void;
  onMoveItem: (itemKey: string, direction: -1 | 1) => void;
}) {
  const circuit = section.rounds > 1;

  return (
    <Surface className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12px] text-ink-500">{index + 1}</span>

        <select
          value={section.kind}
          onChange={(event) => onPatch({ kind: event.target.value as SectionKind })}
          aria-label={copy.kinds[section.kind]}
          className={cn(fieldControl, "h-9 w-auto appearance-none px-3 text-[13px]")}
        >
          {SECTION_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {copy.kinds[kind]}
            </option>
          ))}
        </select>

        <input
          value={section.title[contentLocale] ?? ""}
          onChange={(event) =>
            onPatch({ title: setLocale(section.title, contentLocale, event.target.value) })
          }
          placeholder={copy.sectionTitlePlaceholder}
          aria-label={copy.sectionTitle}
          maxLength={LIMITS.title}
          className={cn(fieldControl, "h-9 min-w-0 flex-1 text-[14px]")}
        />

        <span className="inline-flex items-center gap-1 font-mono text-[12px] text-ink-400">
          <Timer className="size-3.5" />
          {formatDuration(sectionSec(stripSection(section), lookup))}
        </span>

        <div className="flex items-center gap-0.5">
          <IconButton label={copy.moveUp} disabled={isFirst} onClick={() => onMove(-1)}>
            <ChevronUp className="size-4" />
          </IconButton>
          <IconButton label={copy.moveDown} disabled={isLast} onClick={() => onMove(1)}>
            <ChevronDown className="size-4" />
          </IconButton>
          <IconButton
            label={copy.removeSection}
            onClick={onRemove}
            className="hover:text-danger"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <NumField
          label={copy.rounds}
          hint={copy.roundsHint}
          value={section.rounds}
          min={LIMITS.rounds.min}
          max={LIMITS.rounds.max}
          onChange={(value) => onPatch({ rounds: value ?? LIMITS.rounds.min })}
        />
        <NumField
          label={copy.restBetweenRounds}
          value={section.restBetweenRoundsSec}
          min={LIMITS.restSec.min}
          max={LIMITS.restSec.max}
          suffix={copy.seconds}
          presets
          disabled={!circuit}
          onChange={(value) => onPatch({ restBetweenRoundsSec: value ?? 0 })}
        />
        <NumField
          label={copy.restAfter}
          value={section.restAfterSec}
          min={LIMITS.restSec.min}
          max={LIMITS.restSec.max}
          suffix={copy.seconds}
          presets
          onChange={(value) => onPatch({ restAfterSec: value ?? 0 })}
        />
      </div>

      <div className="flex flex-col gap-2">
        {section.items.length === 0 ? (
          <p className="rounded-control border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-ink-500">
            {copy.emptySection}
          </p>
        ) : (
          section.items.map((item, itemIndex) => (
            <ItemRow
              key={item.key}
              item={item}
              index={itemIndex}
              rounds={section.rounds}
              isFirst={itemIndex === 0}
              isLast={itemIndex === section.items.length - 1}
              exercise={byId.get(item.exerciseId)}
              contentLocale={contentLocale}
              lang={lang}
              copy={copy}
              metricLabels={metricLabels}
              onPatch={(patch) => onPatchItem(item.key, patch)}
              onRemove={() => onRemoveItem(item.key)}
              onMove={(direction) => onMoveItem(item.key, direction)}
            />
          ))
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onAddExercise}
        disabled={section.items.length >= LIMITS.itemsPerSection}
        className="self-start"
      >
        <Plus className="size-4" />
        {copy.addExercise}
      </Button>
    </Surface>
  );
}

/* -------------------------------------------------------------- one line */

function ItemRow({
  item,
  index,
  rounds,
  isFirst,
  isLast,
  exercise,
  contentLocale,
  lang,
  copy,
  metricLabels,
  onPatch,
  onRemove,
  onMove,
}: {
  item: EditableItem;
  index: number;
  rounds: number;
  isFirst: boolean;
  isLast: boolean;
  exercise: ExerciseOption | undefined;
  contentLocale: Locale;
  lang: Locale;
  copy: WorkoutBuilderCopy;
  metricLabels: Record<MetricKind, string>;
  onPatch: (patch: Partial<EditableItem>) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="rounded-control border border-white/8 bg-white/2 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-ink-500">{index + 1}</span>

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[14px] font-medium",
            exercise ? "text-ink-100" : "text-danger",
          )}
        >
          {exercise ? translate(exercise.title, lang) : item.exerciseId}
        </span>

        {rounds > 1 ? (
          <span className="font-mono text-[11px] text-ink-500">
            {rounds} × {item.sets}
          </span>
        ) : null}

        <div className="flex items-center gap-0.5">
          <IconButton label={copy.moveUp} disabled={isFirst} onClick={() => onMove(-1)}>
            <ChevronUp className="size-4" />
          </IconButton>
          <IconButton label={copy.moveDown} disabled={isLast} onClick={() => onMove(1)}>
            <ChevronDown className="size-4" />
          </IconButton>
          <IconButton
            label={copy.removeItem}
            onClick={onRemove}
            className="hover:text-danger"
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
          <span className="text-[11px] font-medium text-ink-400">{copy.mode}</span>
          <div className="flex h-10 rounded-control border border-white/10 bg-white/4 p-1">
            {(
              [
                ["reps", copy.modeReps],
                ["time", copy.modeTime],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onPatch(switchMode(item, value))}
                className={cn(
                  "flex-1 rounded-lg px-2 text-[12px] font-medium transition-colors",
                  item.mode === value
                    ? "bg-brand-500/18 text-brand-100"
                    : "text-ink-400 hover:text-ink-100",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <NumField
          label={copy.sets}
          value={item.sets}
          min={LIMITS.sets.min}
          max={LIMITS.sets.max}
          compact
          onChange={(value) => onPatch({ sets: value ?? LIMITS.sets.min })}
        />

        {item.mode === "reps" ? (
          <NumField
            label={copy.reps}
            value={item.reps ?? 0}
            min={LIMITS.reps.min}
            max={LIMITS.reps.max}
            compact
            onChange={(reps) => onPatch({ reps })}
          />
        ) : (
          <NumField
            label={copy.durationField}
            value={item.durationSec ?? 0}
            min={LIMITS.durationSec.min}
            max={LIMITS.durationSec.max}
            suffix={copy.seconds}
            compact
            onChange={(durationSec) => onPatch({ durationSec })}
          />
        )}

        <NumField
          label={copy.rest}
          value={item.restSec}
          min={LIMITS.restSec.min}
          max={LIMITS.restSec.max}
          suffix={copy.seconds}
          presets
          compact
          onChange={(value) => onPatch({ restSec: value ?? 0 })}
        />

        <NumField
          label={copy.rpe}
          value={item.rpe}
          min={LIMITS.rpe.min}
          max={LIMITS.rpe.max}
          step={0.5}
          nullable
          compact
          onChange={(rpe) => onPatch({ rpe })}
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-ink-400">{copy.tempo}</span>
          <input
            value={item.tempo ?? ""}
            onChange={(event) => onPatch({ tempo: event.target.value || null })}
            placeholder={copy.tempoPlaceholder}
            maxLength={7}
            spellCheck={false}
            className={cn(fieldControl, "h-10 px-2.5 text-center font-mono text-[13px]")}
          />
        </label>
      </div>

      {/* The whole point of equipment_metrics: a treadmill line asks for
          incline and speed, a barbell line asks for weight, and neither list
          is written down anywhere in this file. */}
      {exercise?.metrics.length ? (
        <div className="mt-3">
          <span className="text-[11px] font-medium text-ink-400">
            {copy.metricsLabel}
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {exercise.metrics.map((metric) => (
              <label key={metric} className="flex flex-col gap-1">
                <span className="text-[11px] text-ink-500">{metricLabels[metric]}</span>
                <input
                  value={item.metrics[metric] ?? ""}
                  onChange={(event) =>
                    onPatch({
                      metrics: { ...item.metrics, [metric]: event.target.value },
                    })
                  }
                  maxLength={16}
                  inputMode="decimal"
                  className={cn(fieldControl, "h-10 px-2.5 text-[13px]")}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <label className="mt-3 flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-ink-400">
          {copy.note} · {localeShort[contentLocale]}
        </span>
        <input
          value={item.note[contentLocale] ?? ""}
          onChange={(event) =>
            onPatch({ note: setLocale(item.note, contentLocale, event.target.value) })
          }
          placeholder={copy.notePlaceholder}
          maxLength={LIMITS.note}
          className={cn(fieldControl, "h-10 text-[13px]")}
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------- fragments */

function Stat({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("size-4", strong ? "text-brand-300" : "text-ink-500")} />
      <div className="leading-tight">
        <p
          className={cn(
            "font-mono text-[14px]",
            strong ? "font-semibold text-brand-100" : "text-ink-200",
          )}
        >
          {value}
        </p>
        <p className="text-[10px] uppercase tracking-[0.1em] text-ink-500">{label}</p>
      </div>
    </div>
  );
}

function ContentLocaleTabs({
  value,
  onChange,
  label,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  label: string;
}) {
  return (
    <div
      className="flex rounded-control border border-white/10 bg-white/4 p-1"
      role="group"
      aria-label={label}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => onChange(locale)}
          aria-pressed={value === locale}
          className={cn(
            "h-8 rounded-lg px-2.5 text-[12px] font-semibold transition-colors",
            value === locale
              ? "bg-brand-500/18 text-brand-100"
              : "text-ink-400 hover:text-ink-100",
          )}
        >
          {localeShort[locale]}
        </button>
      ))}
    </div>
  );
}

function TagPicker({
  label,
  empty,
  options,
  selected,
  lang,
  onToggle,
}: {
  label: string;
  empty: string;
  options: TagOption[];
  selected: string[];
  lang: Locale;
  onToggle: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-[13px] font-medium text-ink-300">{label}</legend>
      {options.length === 0 ? (
        <p className="text-[12px] text-ink-500">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = selected.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(option.id)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-2.5 py-1.5 text-[12px] transition-colors",
                  on
                    ? "border-brand-500/40 bg-brand-500/14 text-brand-100"
                    : "border-white/10 bg-white/4 text-ink-400 hover:border-white/20 hover:text-ink-100",
                )}
              >
                {translate(option.name, lang)}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

/**
 * A number input that never lets an out-of-range value into the draft.
 *
 * Clamping on change rather than validating on save keeps the live preview
 * honest: a section with `rounds: 0` would render a zero-minute block and the
 * only complaint would arrive from the server minutes later.
 */
function NumField({
  label,
  hint,
  value,
  min,
  max,
  step = 1,
  suffix,
  presets,
  compact,
  disabled,
  nullable,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number | null;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  presets?: boolean;
  compact?: boolean;
  disabled?: boolean;
  nullable?: boolean;
  onChange: (value: number | null) => void;
}) {

  return (
    <label className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2")}>
      <span
        className={cn(
          "font-medium text-ink-400",
          compact ? "text-[11px]" : "text-[13px] text-ink-300",
        )}
      >
        {label}
        {suffix ? <span className="text-ink-500"> ({suffix})</span> : null}
      </span>

      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        list={presets ? REST_PRESETS_ID : undefined}
        disabled={disabled}
        onChange={(event) => {
          const raw = event.target.value;
          if (raw === "") {
            onChange(nullable ? null : min);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          onChange(clamp(parsed, min, max));
        }}
        className={cn(
          fieldControl,
          compact ? "h-10 px-2.5 text-[13px]" : "h-11 text-[14px]",
        )}
      />

      {hint ? <p className="text-[11px] text-ink-500">{hint}</p> : null}
    </label>
  );
}

function IconButton({
  label,
  className,
  children,
  ...props
}: { label: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-control text-ink-400",
        "transition-colors hover:bg-white/8 hover:text-ink-100",
        "disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- helpers */

function setLocale(value: Translated, locale: Locale, text: string): Translated {
  const next = { ...value };
  if (text) next[locale] = text;
  else delete next[locale];
  return next;
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

function move<T>(list: T[], match: (entry: T) => boolean, direction: -1 | 1): T[] {
  const index = list.findIndex(match);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return list;

  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Switching a line between reps and time keeps the other number around, so
 * flipping back does not lose what was typed. Only the mode's own field is
 * seeded when it is still empty.
 */
function switchMode(item: EditableItem, mode: SetMode): Partial<EditableItem> {
  if (mode === item.mode) return {};
  if (mode === "time") return { mode, durationSec: item.durationSec ?? 30 };
  return { mode, reps: item.reps ?? 10 };
}

function blankSection(kind: SectionKind): EditableSection {
  return {
    key: newKey(),
    kind,
    title: {},
    rounds: 1,
    // A warm-up runs straight through; work blocks get a default worth keeping.
    restBetweenRoundsSec: kind === "main" ? 60 : 0,
    restAfterSec: kind === "cooldown" ? 0 : 60,
    items: [],
  };
}

function blankItem(option: ExerciseOption, section: EditableSection): EditableItem {
  // The exercise proposes how it is counted; a plank arrives as time, a squat
  // as reps. The coach still overrides per line.
  const mode: SetMode = option.defaultMode === "time" ? "time" : "reps";

  return {
    key: newKey(),
    exerciseId: option.id,
    mode,
    // In a circuit the block's rounds already carry the volume, so a new line
    // starts at one set per round rather than multiplying to nine.
    sets: section.rounds > 1 ? 1 : 3,
    reps: mode === "reps" ? 10 : null,
    durationSec: mode === "time" ? 30 : null,
    restSec: section.kind === "main" ? 60 : 15,
    rpe: null,
    tempo: null,
    metrics: {},
    note: {},
  };
}

/**
 * The preview and the estimate work on the plain draft shape, and so does the
 * save action — the client-only `key` is spelled out of the object here rather
 * than deleted, so a field added to the draft type fails to compile until it
 * is carried through.
 */
function stripSection(section: EditableSection): DraftSectionInput {
  return {
    kind: section.kind,
    title: section.title,
    rounds: section.rounds,
    restBetweenRoundsSec: section.restBetweenRoundsSec,
    restAfterSec: section.restAfterSec,
    items: section.items.map(stripItem),
  };
}

function stripItem(item: EditableItem): DraftItemInput {
  return {
    exerciseId: item.exerciseId,
    mode: item.mode,
    sets: item.sets,
    reps: item.reps,
    durationSec: item.durationSec,
    restSec: item.restSec,
    rpe: item.rpe,
    tempo: item.tempo,
    metrics: item.metrics,
    note: item.note,
  };
}
