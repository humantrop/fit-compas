"use client";

import { AlertTriangle, ArrowLeft, Check, Eye, EyeOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  FieldLabel,
  Hint,
  control,
  selectControl,
  textareaControl,
} from "@/components/admin/exercises/ui";
import { TagPicker } from "@/components/admin/exercises/tag-picker";
import {
  VideoUploader,
  type UploaderAsset,
} from "@/components/admin/exercises/video-uploader";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import type { Translated } from "@/db/schema/i18n";
import {
  createExerciseAction,
  deleteExerciseAction,
  setExercisePublishedAction,
  updateExerciseAction,
} from "@/lib/exercises/actions";
import type { TagOptions } from "@/lib/exercises/queries";
import {
  DEFAULT_MODES,
  DIFFICULTIES,
  EXERCISE_IDLE,
  isDefaultMode,
  type DefaultMode,
  type ExerciseState,
  type ExerciseTagIds,
} from "@/lib/exercises/types";
import { locales, type Locale } from "@/lib/i18n/config";
import type { ExercisesDictionary } from "@/lib/i18n/exercises-dictionary";
import { cn } from "@/lib/utils";

export type ExerciseFormValues = {
  id: string;
  slug: string;
  title: Translated;
  description: Translated | null;
  cues: Translated | null;
  difficulty: string;
  defaultMode: string;
  isUnilateral: boolean;
  isPublished: boolean;
  tags: ExerciseTagIds;
};

export function ExerciseForm({
  lang,
  exercise,
  video,
  options,
  copy,
}: {
  lang: Locale;
  /** Null in create mode. */
  exercise: ExerciseFormValues | null;
  video: UploaderAsset | null;
  options: TagOptions;
  copy: ExercisesDictionary;
}) {
  const editing = exercise !== null;
  const form = copy.form;

  const [state, action, pending] = useActionState<ExerciseState, FormData>(
    editing ? updateExerciseAction : createExerciseAction,
    EXERCISE_IDLE,
  );

  // Which language's translation fields are on screen. All three are always in
  // the DOM — hidden, not unmounted — so a switch never drops what was typed
  // and the submit always carries every locale.
  const [tab, setTab] = useState<Locale>(lang);

  const [mode, setMode] = useState<DefaultMode>(() =>
    isDefaultMode(exercise?.defaultMode) ? exercise.defaultMode : "reps",
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/${lang}/admin/exercises`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-100"
        >
          <ArrowLeft className="size-4" />
          {form.back}
        </Link>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
          {editing ? form.editTitle : form.newTitle}
        </h1>
      </div>

      <form action={action} className="flex flex-col gap-6">
        {editing ? <input type="hidden" name="id" value={exercise.id} /> : null}
        <input type="hidden" name="lang" value={lang} />

        {/* ---------------------------------------------------------- names */}
        <Section title={form.basics} hint={form.basicsHint}>
          <LocaleTabs active={tab} onChange={setTab} label={form.localeTab} />

          <div className="flex flex-col gap-4">
            {locales.map((locale) => (
              <div key={locale} hidden={locale !== tab} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <FieldLabel>
                    {form.titleLabel} · {locale.toUpperCase()}
                  </FieldLabel>
                  <input
                    name={`title_${locale}`}
                    defaultValue={exercise?.title[locale] ?? ""}
                    maxLength={120}
                    required={locale === "sr"}
                    className={control}
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <FieldLabel>
                    {form.cues} · {locale.toUpperCase()}
                  </FieldLabel>
                  <input
                    name={`cues_${locale}`}
                    defaultValue={exercise?.cues?.[locale] ?? ""}
                    maxLength={120}
                    className={control}
                  />
                  <Hint>{form.cuesHint}</Hint>
                </label>

                <label className="flex flex-col gap-2">
                  <FieldLabel>
                    {form.description} · {locale.toUpperCase()}
                  </FieldLabel>
                  <textarea
                    name={`description_${locale}`}
                    defaultValue={exercise?.description?.[locale] ?? ""}
                    maxLength={2000}
                    className={textareaControl}
                  />
                  <Hint>{form.descriptionHint}</Hint>
                </label>
              </div>
            ))}
          </div>

          <Hint>{form.titleHint}</Hint>

          <label className="flex flex-col gap-2">
            <FieldLabel>{form.slug}</FieldLabel>
            <input
              name="slug"
              defaultValue={exercise?.slug ?? ""}
              readOnly={editing}
              maxLength={60}
              className={cn(control, editing && "cursor-not-allowed text-ink-400")}
            />
            <Hint>{editing ? form.slugLocked : form.slugHint}</Hint>
          </label>
        </Section>

        {/* ---------------------------------------------------------- video */}
        <Section title={copy.video.title}>
          <VideoUploader
            exerciseId={exercise?.id ?? null}
            initialAsset={video}
            copy={copy.video}
            errors={copy.errors}
          />
        </Section>

        {/* ------------------------------------------------------- settings */}
        <Section title={form.settings}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel>{form.difficulty}</FieldLabel>
              <div className="relative">
                <select
                  name="difficulty"
                  defaultValue={exercise?.difficulty ?? "intermediate"}
                  className={selectControl}
                >
                  {DIFFICULTIES.map((level) => (
                    <option key={level} value={level} className="bg-base-900">
                      {copy.difficulty[level]}
                    </option>
                  ))}
                </select>
                <Caret />
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <FieldLabel>{copy.mode.label}</FieldLabel>
              <div className="flex h-12 items-center gap-1 rounded-control border border-white/10 bg-white/4 p-1">
                {DEFAULT_MODES.map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex h-full flex-1 cursor-pointer items-center justify-center rounded-[10px]",
                      "text-[14px] transition-colors",
                      mode === option
                        ? "bg-brand-500/15 text-brand-100"
                        : "text-ink-400 hover:text-ink-200",
                    )}
                  >
                    <input
                      type="radio"
                      name="default_mode"
                      value={option}
                      checked={mode === option}
                      onChange={() => setMode(option)}
                      className="sr-only"
                    />
                    {copy.mode[option]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Hint>{copy.mode.hint}</Hint>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="is_unilateral"
              defaultChecked={exercise?.isUnilateral ?? false}
              className="mt-0.5 size-4 accent-brand-500"
            />
            <span className="flex flex-col gap-1">
              <FieldLabel>{form.unilateral}</FieldLabel>
              <Hint>{form.unilateralHint}</Hint>
            </span>
          </label>
        </Section>

        {/* ----------------------------------------------------------- tags */}
        <Section title={form.tagsTitle} hint={form.tagsHint}>
          <div className="grid gap-6 lg:grid-cols-2">
            <TagPicker
              name="muscles"
              label={form.muscles}
              hint={form.musclesHint}
              options={options.muscles}
              initial={exercise?.tags.muscles ?? []}
              primary={{
                name: "muscle_primary",
                initial: exercise?.tags.primaryMuscles ?? [],
              }}
              locale={lang}
              copy={form}
            />
            <TagPicker
              name="equipment"
              label={form.equipment}
              options={options.equipment}
              initial={exercise?.tags.equipment ?? []}
              locale={lang}
              copy={form}
            />
            <TagPicker
              name="activities"
              label={form.activities}
              options={options.activities}
              initial={exercise?.tags.activities ?? []}
              locale={lang}
              copy={form}
            />
            <TagPicker
              name="goals"
              label={form.goals}
              options={options.goals}
              initial={exercise?.tags.goals ?? []}
              locale={lang}
              copy={form}
            />
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending
              ? editing
                ? form.saving
                : form.creating
              : editing
                ? form.save
                : form.create}
          </Button>

          {state.status === "saved" ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-300">
              <Check className="size-4" />
              {form.saved}
            </span>
          ) : null}

          {state.status === "error" && state.code ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-rose-300">
              <AlertTriangle className="size-4" />
              {copy.errors[state.code]}
            </span>
          ) : null}
        </div>
      </form>

      {/* Publish and delete sit outside the editing form on purpose: HTML has
          no nested forms, and they are decisions about the exercise rather
          than fields of it. */}
      {editing ? (
        <Surface tone="bare" className="flex flex-col gap-5 p-5">
          <PublishControl lang={lang} exercise={exercise} copy={copy} />
          <div className="h-px bg-white/6" />
          <DeleteControl lang={lang} id={exercise.id} copy={copy} />
        </Surface>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- sections */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Surface className="flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <h2 className="text-[15px] font-semibold text-ink-100">{title}</h2>
        {hint ? <p className="mt-1 text-[13px] text-ink-500">{hint}</p> : null}
      </div>
      {children}
    </Surface>
  );
}

function LocaleTabs({
  active,
  onChange,
  label,
}: {
  active: Locale;
  onChange: (locale: Locale) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex gap-1 rounded-control border border-white/10 bg-white/4 p-1"
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          role="tab"
          aria-selected={locale === active}
          onClick={() => onChange(locale)}
          className={cn(
            "h-9 rounded-[10px] px-4 text-[13px] font-semibold transition-colors",
            locale === active
              ? "bg-brand-500/15 text-brand-100"
              : "text-ink-400 hover:text-ink-200",
          )}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Caret() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-500"
    >
      <svg viewBox="0 0 12 12" className="size-3 fill-none stroke-current stroke-[1.5]">
        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------ publish and delete */

function PublishControl({
  lang,
  exercise,
  copy,
}: {
  lang: Locale;
  exercise: ExerciseFormValues;
  copy: ExercisesDictionary;
}) {
  const [state, action, pending] = useActionState<ExerciseState, FormData>(
    setExercisePublishedAction,
    EXERCISE_IDLE,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={exercise.id} />
      <input type="hidden" name="lang" value={lang} />
      <input
        type="hidden"
        name="published"
        value={exercise.isPublished ? "false" : "true"}
      />

      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {exercise.isPublished ? (
          <EyeOff className="size-4" />
        ) : (
          <Eye className="size-4" />
        )}
        {exercise.isPublished ? copy.form.unpublish : copy.form.publish}
      </Button>

      <p className="min-w-0 flex-1 text-[12px] text-ink-500">
        {state.status === "error" && state.code
          ? copy.errors[state.code]
          : copy.form.publishHint}
      </p>
    </form>
  );
}

function DeleteControl({
  lang,
  id,
  copy,
}: {
  lang: Locale;
  id: string;
  copy: ExercisesDictionary;
}) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<ExerciseState, FormData>(
    deleteExerciseAction,
    EXERCISE_IDLE,
  );

  if (!confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(true)}
          className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
        >
          <Trash2 className="size-4" />
          {copy.form.delete}
        </Button>
        {state.status === "error" && state.code ? (
          <span className="text-[12px] text-rose-300">{copy.errors[state.code]}</span>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="lang" value={lang} />

      <p className="w-full text-[13px] text-ink-200">{copy.form.deleteConfirm}</p>

      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        className="border-rose-500/35 bg-rose-500/12 text-rose-200 hover:border-rose-500/50 hover:bg-rose-500/20"
      >
        <Trash2 className="size-4" />
        {pending ? copy.form.deleting : copy.form.delete}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        {copy.form.cancel}
      </Button>
    </form>
  );
}
