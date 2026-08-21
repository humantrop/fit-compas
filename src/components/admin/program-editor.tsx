"use client";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  Dumbbell,
  Moon,
  Pencil,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import {
  addWeekAction,
  deleteProgramAction,
  deleteWeekAction,
  duplicateWeekAction,
  moveWeekAction,
  setDayAction,
  setProgramPublishedAction,
  updateProgramAction,
  updateWeekAction,
} from "@/lib/programs/actions";
import { DIFFICULTIES, PROGRAM_LIMITS } from "@/lib/programs/config";
import type { ProgramDayView, ProgramDetail, ProgramWeekView } from "@/lib/programs/queries";
import { PROGRAM_IDLE, type ProgramErrorCopy, type ProgramState } from "@/lib/programs/types";
import { cn } from "@/lib/utils";

/** Mirrors the workout-source shape without importing a server-only module. */
export type WorkoutChoice = { id: string; label: string; isPublished: boolean };

export type ProgramEditorCopy = {
  details: string;
  detailsTitle: string;
  titleLabel: string;
  titleHint: string;
  descriptionLabel: string;
  slug: string;
  slugLocked: string;
  difficulty: string;
  difficulties: Record<string, string>;
  daysPerWeek: string;
  daysPerWeekHint: string;
  daysPerWeekWarning: string;
  save: string;
  saving: string;
  cancel: string;
  publish: string;
  unpublish: string;
  published: string;
  draft: string;
  remove: string;
  removeConfirm: string;
  weekCount: string;
  filledDays: string;
  restDays: string;
  addWeek: string;
  week: string;
  weekLabel: string;
  weekNote: string;
  editWeek: string;
  duplicateWeek: string;
  deleteWeek: string;
  moveUp: string;
  moveDown: string;
  day: string;
  dayEmpty: string;
  dayRest: string;
  mode: string;
  modeEmpty: string;
  modeRest: string;
  modeWorkout: string;
  workout: string;
  workoutPlaceholder: string;
  workoutsUnavailable: string;
  workoutDraft: string;
  note: string;
  noteHint: string;
};

export function ProgramEditor({
  program,
  workouts,
  workoutsAvailable,
  lang,
  copy,
  errors,
}: {
  program: ProgramDetail;
  workouts: WorkoutChoice[];
  /** False until feature 07 creates the workouts table. */
  workoutsAvailable: boolean;
  lang: Locale;
  copy: ProgramEditorCopy;
  errors: ProgramErrorCopy;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [editingWeekId, setEditingWeekId] = useState<string | null>(null);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const totalDays = program.weekCount * program.daysPerWeek;

  /** Every non-form action returns the same state shape, so one handler does. */
  function run(fn: () => Promise<ProgramState>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.status === "error" && result.code ? errors[result.code] : null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Surface tone="strong" edge className="flex flex-wrap items-center gap-4 p-5">
        <dl className="flex flex-1 flex-wrap gap-x-7 gap-y-2 text-[12px] text-ink-400">
          <div className="flex items-baseline gap-2">
            <dt>{copy.weekCount}</dt>
            <dd className="font-mono text-[15px] text-ink-100">{program.weekCount}</dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>{copy.filledDays}</dt>
            <dd className="font-mono text-[15px] text-ink-100">
              {program.filledDays}/{totalDays}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt>{copy.restDays}</dt>
            <dd className="font-mono text-[15px] text-ink-100">{program.restDays}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={program.isPublished ? "secondary" : "primary"}
            disabled={pending}
            onClick={() =>
              run(() => setProgramPublishedAction(program.id, !program.isPublished))
            }
          >
            {program.isPublished ? copy.unpublish : copy.publish}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails((open) => !open)}
          >
            <Settings2 className="size-4" />
            {copy.details}
          </Button>
        </div>
      </Surface>

      {notice ? (
        <p
          role="alert"
          className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
        >
          {notice}
        </p>
      ) : null}

      {showDetails ? (
        <DetailsForm
          program={program}
          copy={copy}
          errors={errors}
          onDone={() => setShowDetails(false)}
        />
      ) : null}

      <div className="flex flex-col gap-4">
        {program.weeks.map((week, index) => (
          <WeekCard
            key={week.id}
            week={week}
            index={index}
            isFirst={index === 0}
            isLast={index === program.weeks.length - 1}
            daysPerWeek={program.daysPerWeek}
            workoutById={workoutById}
            workoutsAvailable={workoutsAvailable}
            workouts={workouts}
            lang={lang}
            copy={copy}
            errors={errors}
            pending={pending}
            editing={editingWeekId === week.id}
            onEdit={() => {
              setEditingDayId(null);
              setEditingWeekId((current) => (current === week.id ? null : week.id));
            }}
            editingDayId={editingDayId}
            onEditDay={(dayId) => {
              setEditingWeekId(null);
              setEditingDayId((current) => (current === dayId ? null : dayId));
            }}
            run={run}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending || program.weekCount >= PROGRAM_LIMITS.maxWeeks}
          onClick={() => run(() => addWeekAction(program.id))}
        >
          <Plus className="size-4" />
          {copy.addWeek}
        </Button>

        <DeleteProgram program={program} lang={lang} copy={copy} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- weeks */

function WeekCard({
  week,
  index,
  isFirst,
  isLast,
  daysPerWeek,
  workoutById,
  workouts,
  workoutsAvailable,
  lang,
  copy,
  errors,
  pending,
  editing,
  onEdit,
  editingDayId,
  onEditDay,
  run,
}: {
  week: ProgramWeekView;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  daysPerWeek: number;
  workoutById: Map<string, WorkoutChoice>;
  workouts: WorkoutChoice[];
  workoutsAvailable: boolean;
  lang: Locale;
  copy: ProgramEditorCopy;
  errors: ProgramErrorCopy;
  pending: boolean;
  editing: boolean;
  onEdit: () => void;
  editingDayId: string | null;
  onEditDay: (dayId: string) => void;
  run: (fn: () => Promise<ProgramState>) => void;
}) {
  const label = translate(week.label, lang);
  const note = translate(week.note, lang);
  const openDay = week.days.find((day) => day.id === editingDayId) ?? null;

  return (
    <Surface className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink-50">
            {copy.week} {index + 1}
            {label ? <span className="text-ink-400"> · {label}</span> : null}
          </h2>
          {note ? (
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink-400">
              {note}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          <IconButton label={copy.editWeek} onClick={onEdit} disabled={pending}>
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            label={copy.duplicateWeek}
            onClick={() => run(() => duplicateWeekAction(week.id))}
            disabled={pending}
          >
            <Copy className="size-4" />
          </IconButton>
          <IconButton
            label={copy.moveUp}
            onClick={() => run(() => moveWeekAction(week.id, "up"))}
            disabled={pending || isFirst}
          >
            <ChevronUp className="size-4" />
          </IconButton>
          <IconButton
            label={copy.moveDown}
            onClick={() => run(() => moveWeekAction(week.id, "down"))}
            disabled={pending || isLast}
          >
            <ChevronDown className="size-4" />
          </IconButton>
          <IconButton
            label={copy.deleteWeek}
            onClick={() => run(() => deleteWeekAction(week.id))}
            disabled={pending}
            danger
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>

      {editing ? (
        <WeekForm week={week} copy={copy} errors={errors} onDone={onEdit} />
      ) : null}

      {/* auto-fill rather than a fixed column count: days-per-week is a per
          program setting, and Tailwind cannot generate a class per value. */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(7.5rem, 1fr))" }}
      >
        {week.days.map((day) => (
          <DayCell
            key={day.id}
            day={day}
            copy={copy}
            workout={day.workoutId ? workoutById.get(day.workoutId) : undefined}
            lang={lang}
            active={day.id === editingDayId}
            onClick={() => onEditDay(day.id)}
          />
        ))}

        {/* A week is created with exactly days_per_week slots; a gap here means
            something went wrong, and hiding it would only delay the question. */}
        {week.days.length < daysPerWeek ? (
          <div className="rounded-control border border-dashed border-danger/30 p-3 text-[12px] text-danger">
            {week.days.length}/{daysPerWeek}
          </div>
        ) : null}
      </div>

      {openDay ? (
        <DayForm
          day={openDay}
          workouts={workouts}
          workoutsAvailable={workoutsAvailable}
          lang={lang}
          copy={copy}
          errors={errors}
          onDone={() => onEditDay(openDay.id)}
        />
      ) : null}
    </Surface>
  );
}

function DayCell({
  day,
  workout,
  lang,
  copy,
  active,
  onClick,
}: {
  day: ProgramDayView;
  workout: WorkoutChoice | undefined;
  lang: Locale;
  copy: ProgramEditorCopy;
  active: boolean;
  onClick: () => void;
}) {
  const note = translate(day.note, lang);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[5.5rem] flex-col gap-1.5 rounded-control border p-3 text-left transition-colors",
        active
          ? "border-brand-500/45 bg-brand-500/12"
          : day.workoutId
            ? "border-white/12 bg-white/5 hover:border-white/20"
            : day.isRest
              ? "border-white/8 bg-white/2 hover:border-white/16"
              : "border-dashed border-white/12 hover:border-white/24",
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {copy.day} {day.position + 1}
      </span>

      {day.workoutId ? (
        <span className="flex items-start gap-1.5 text-[13px] font-medium text-ink-100">
          <Dumbbell className="mt-0.5 size-3.5 shrink-0 text-brand-300" />
          <span className="line-clamp-2">
            {workout?.label ?? day.workoutId.slice(0, 8)}
          </span>
        </span>
      ) : day.isRest ? (
        <span className="flex items-center gap-1.5 text-[13px] text-ink-400">
          <Moon className="size-3.5 shrink-0" />
          {copy.dayRest}
        </span>
      ) : (
        <span className="text-[13px] text-ink-500">{copy.dayEmpty}</span>
      )}

      {note ? (
        <span className="line-clamp-2 text-[11px] leading-snug text-ink-500">{note}</span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------- forms */

function WeekForm({
  week,
  copy,
  errors,
  onDone,
}: {
  week: ProgramWeekView;
  copy: ProgramEditorCopy;
  errors: ProgramErrorCopy;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateWeekAction, PROGRAM_IDLE);

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  return (
    <Surface tone="bare" className="p-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="weekId" value={week.id} />

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`label_${locale}`}
              label={`${copy.weekLabel} · ${localeNames[locale]}`}
              defaultValue={week.label?.[locale] ?? ""}
              maxLength={PROGRAM_LIMITS.labelMax}
              autoComplete="off"
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`note_${locale}`}
              label={`${copy.weekNote} · ${localeNames[locale]}`}
              defaultValue={week.note?.[locale] ?? ""}
              maxLength={PROGRAM_LIMITS.noteMax}
              autoComplete="off"
            />
          ))}
        </div>

        <FormFooter
          state={state}
          errors={errors}
          copy={copy}
          pending={pending}
          onCancel={onDone}
        />
      </form>
    </Surface>
  );
}

function DayForm({
  day,
  workouts,
  workoutsAvailable,
  lang,
  copy,
  errors,
  onDone,
}: {
  day: ProgramDayView;
  workouts: WorkoutChoice[];
  workoutsAvailable: boolean;
  lang: Locale;
  copy: ProgramEditorCopy;
  errors: ProgramErrorCopy;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(setDayAction, PROGRAM_IDLE);
  const [mode, setMode] = useState<"empty" | "rest" | "workout">(
    day.workoutId ? "workout" : day.isRest ? "rest" : "empty",
  );

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  const modes = [
    ["empty", copy.modeEmpty],
    ["rest", copy.modeRest],
    ["workout", copy.modeWorkout],
  ] as const;

  return (
    <Surface tone="bare" className="p-4">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="dayId" value={day.id} />
        <input type="hidden" name="mode" value={mode} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-ink-50">
            {copy.day} {day.position + 1}
          </h3>
          <button
            type="button"
            onClick={onDone}
            aria-label={copy.cancel}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[13px] font-medium text-ink-300">{copy.mode}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {modes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                disabled={value === "workout" && !workoutsAvailable}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-[13px] transition-colors disabled:opacity-40",
                  mode === value
                    ? "border-brand-500/40 bg-brand-500/14 text-brand-100"
                    : "border-white/10 bg-white/4 text-ink-300 hover:border-white/20",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {mode === "workout" ? (
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">{copy.workout}</span>
            <select
              name="workoutId"
              defaultValue={day.workoutId ?? ""}
              className={cn(fieldControl, "appearance-none")}
            >
              <option value="">{copy.workoutPlaceholder}</option>
              {workouts.map((workout) => (
                <option key={workout.id} value={workout.id}>
                  {workout.label}
                  {workout.isPublished ? "" : ` · ${copy.workoutDraft}`}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {!workoutsAvailable ? (
          <p className="rounded-control border border-white/8 bg-white/2 px-4 py-3 text-[13px] leading-relaxed text-ink-400">
            {copy.workoutsUnavailable}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`note_${locale}`}
              label={`${copy.note} · ${localeNames[locale]}`}
              defaultValue={day.note?.[locale] ?? ""}
              maxLength={PROGRAM_LIMITS.noteMax}
              autoComplete="off"
              hint={locale === lang ? copy.noteHint : undefined}
            />
          ))}
        </div>

        <FormFooter
          state={state}
          errors={errors}
          copy={copy}
          pending={pending}
          onCancel={onDone}
        />
      </form>
    </Surface>
  );
}

function DetailsForm({
  program,
  copy,
  errors,
  onDone,
}: {
  program: ProgramDetail;
  copy: ProgramEditorCopy;
  errors: ProgramErrorCopy;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(updateProgramAction, PROGRAM_IDLE);
  const [daysPerWeek, setDaysPerWeek] = useState(program.daysPerWeek);

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  return (
    <Surface tone="strong" edge className="p-4 sm:p-5">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={program.id} />

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-ink-50">{copy.detailsTitle}</h3>
          <button
            type="button"
            onClick={onDone}
            aria-label={copy.cancel}
            className="inline-flex size-9 items-center justify-center rounded-control text-ink-400 transition-colors hover:bg-white/8 hover:text-ink-100"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`title_${locale}`}
              label={`${copy.titleLabel} · ${localeNames[locale]}`}
              defaultValue={program.title[locale] ?? ""}
              required={locale === "sr"}
              maxLength={PROGRAM_LIMITS.titleMax}
              autoComplete="off"
              hint={locale === "sr" ? copy.titleHint : undefined}
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {locales.map((locale) => (
            <Field
              key={locale}
              name={`description_${locale}`}
              label={`${copy.descriptionLabel} · ${localeNames[locale]}`}
              defaultValue={program.description?.[locale] ?? ""}
              maxLength={PROGRAM_LIMITS.descriptionMax}
              autoComplete="off"
            />
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">{copy.slug}</span>
            <div className="flex h-12 items-center rounded-control border border-white/8 bg-white/2 px-4">
              <code className="truncate font-mono text-[13px] text-ink-400">
                {program.slug}
              </code>
            </div>
            <p className="text-[12px] text-ink-500">{copy.slugLocked}</p>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {copy.difficulty}
            </span>
            <select
              name="difficulty"
              defaultValue={program.difficulty}
              className={cn(fieldControl, "appearance-none")}
            >
              {DIFFICULTIES.map((value) => (
                <option key={value} value={value}>
                  {copy.difficulties[value]}
                </option>
              ))}
            </select>
          </label>

          <Field
            name="daysPerWeek"
            type="number"
            label={copy.daysPerWeek}
            hint={
              daysPerWeek < program.daysPerWeek
                ? copy.daysPerWeekWarning
                : copy.daysPerWeekHint
            }
            value={daysPerWeek}
            onChange={(event) => setDaysPerWeek(Number(event.target.value))}
            min={PROGRAM_LIMITS.minDaysPerWeek}
            max={PROGRAM_LIMITS.maxDaysPerWeek}
          />
        </div>

        <FormFooter
          state={state}
          errors={errors}
          copy={copy}
          pending={pending}
          onCancel={onDone}
        />
      </form>
    </Surface>
  );
}

/**
 * Deleting a program takes two clicks rather than a browser confirm(): the
 * dialog is unstyled, and inside the Capacitor WebView it looks like the app
 * crashed into a system prompt.
 */
function DeleteProgram({
  program,
  lang,
  copy,
}: {
  program: ProgramDetail;
  lang: Locale;
  copy: ProgramEditorCopy;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <form action={deleteProgramAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={program.id} />
      <input type="hidden" name="lang" value={lang} />

      {armed ? (
        <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setArmed(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            className="border-danger/30 text-danger hover:border-danger/50"
          >
            <Trash2 className="size-4" />
            {copy.removeConfirm}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-ink-500 hover:text-danger"
          onClick={() => setArmed(true)}
        >
          <Trash2 className="size-4" />
          {copy.remove}
        </Button>
      )}
    </form>
  );
}

/* ---------------------------------------------------------------- fragments */

function FormFooter({
  state,
  errors,
  copy,
  pending,
  onCancel,
}: {
  state: ProgramState;
  errors: ProgramErrorCopy;
  copy: ProgramEditorCopy;
  pending: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      {state.status === "error" && state.code ? (
        <p
          role="alert"
          className="rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] text-danger"
        >
          {errors[state.code]}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? copy.saving : copy.save}
        </Button>
      </div>
    </>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-control transition-colors disabled:opacity-30",
        danger
          ? "text-ink-500 hover:bg-danger/10 hover:text-danger"
          : "text-ink-400 hover:bg-white/8 hover:text-ink-100",
      )}
    >
      {children}
    </button>
  );
}
