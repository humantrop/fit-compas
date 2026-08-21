"use client";

import { CalendarRange, CircleCheck, Pause, Play, Plus, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import {
  assignProgramAction,
  moveAssignmentAction,
  setAssignmentStatusAction,
} from "@/lib/clients/actions";
import type { ClientsCopy } from "@/lib/clients/copy";
import { formatDayLong, formatNumber } from "@/lib/clients/format";
import type { DayKey } from "@/lib/clients/schedule";
import {
  CLIENT_IDLE,
  NOTE_MAX,
  type AssignmentView,
  type ClientState,
  type ProgramOption,
} from "@/lib/clients/types";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * The plan card: what the client is on, and every way to change it.
 *
 * Progress and the last day are passed in already computed rather than worked
 * out here — the server did it against the program grid, and recomputing on the
 * client would mean shipping the whole grid to do it.
 */
export function AssignmentPanel({
  userId,
  assignment,
  programs,
  progress,
  planEnd,
  lang,
  copy,
  today,
}: {
  userId: string;
  assignment: AssignmentView | null;
  programs: ProgramOption[];
  progress: { week: number; day: number; totalWeeks: number } | null;
  planEnd: DayKey | null;
  lang: Locale;
  copy: ClientsCopy;
  today: DayKey;
}) {
  const [assigning, setAssigning] = useState(false);
  const [moving, setMoving] = useState(false);

  const tag = localeTags[lang];
  const detail = copy.detail;

  const [statusState, statusAction, statusPending] = useActionState(
    setAssignmentStatusAction,
    CLIENT_IDLE,
  );

  return (
    <Surface tone="strong" edge className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink-100">
          {detail.planHeading}
        </h2>

        {assignment ? (
          <StatusBadge label={copy.statuses[assignment.status]} status={assignment.status} />
        ) : null}
      </div>

      {assignment ? (
        <div className="flex flex-col gap-4">
          <div>
            <Link
              href={`/${lang}/admin/programs/${assignment.programId}`}
              className="inline-flex items-center gap-2 text-lg font-bold text-ink-50 transition-colors hover:text-brand-200"
            >
              <CalendarRange className="size-4.5 shrink-0 text-brand-300" />
              {translate(assignment.programTitle, lang)}
            </Link>

            <dl className="mt-3 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
              <Row label={detail.planStart}>
                {formatDayLong(assignment.startDate, tag)}
              </Row>

              {planEnd ? (
                <Row label={detail.planEnds}>{formatDayLong(planEnd, tag)}</Row>
              ) : null}

              {progress ? (
                <Row label={detail.planHeading}>
                  {detail.planProgress
                    .replace("{week}", formatNumber(progress.week, tag))
                    .replace("{total}", formatNumber(progress.totalWeeks, tag))
                    .replace("{day}", formatNumber(progress.day, tag))}
                </Row>
              ) : planEnd && planEnd < today ? (
                <Row label={detail.planHeading}>{detail.planEnded}</Row>
              ) : null}
            </dl>
          </div>

          {assignment.note ? (
            <p className="rounded-control border border-white/8 bg-white/4 p-3 text-[13px] leading-relaxed text-ink-300">
              {assignment.note}
            </p>
          ) : null}

          {assignment.status === "paused" ? (
            <p className="text-[12px] leading-relaxed text-amber-200/80">
              {detail.planPausedHint}
            </p>
          ) : null}

          <form action={statusAction} className="flex flex-wrap gap-2">
            <input type="hidden" name="assignmentId" value={assignment.id} />

            {assignment.status === "paused" ? (
              <Button type="submit" name="action" value="resume" size="sm" disabled={statusPending}>
                <Play className="size-4" />
                {detail.resume}
              </Button>
            ) : (
              <Button
                type="submit"
                name="action"
                value="pause"
                size="sm"
                variant="secondary"
                disabled={statusPending}
              >
                <Pause className="size-4" />
                {detail.pause}
              </Button>
            )}

            <Button
              type="submit"
              name="action"
              value="complete"
              size="sm"
              variant="secondary"
              disabled={statusPending}
            >
              <CircleCheck className="size-4" />
              {detail.complete}
            </Button>

            <Button
              type="submit"
              name="action"
              value="cancel"
              size="sm"
              variant="ghost"
              disabled={statusPending}
              onClick={(event) => {
                if (!confirm(detail.cancelPlan + "?")) event.preventDefault();
              }}
            >
              <X className="size-4" />
              {detail.cancelPlan}
            </Button>

            <span className="ml-auto flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMoving((value) => !value);
                  setAssigning(false);
                }}
              >
                {detail.move}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAssigning((value) => !value);
                  setMoving(false);
                }}
              >
                {detail.reassign}
              </Button>
            </span>
          </form>

          <ErrorLine state={statusState} copy={copy} />

          {moving ? (
            <MoveForm
              assignmentId={assignment.id}
              startDate={assignment.startDate}
              copy={copy}
              onDone={() => setMoving(false)}
            />
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[15px] font-semibold text-ink-100">
              {detail.planNone}
            </p>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-500">
              {detail.planNoneHint}
            </p>
          </div>

          {assigning ? null : (
            <Button
              type="button"
              size="sm"
              className="self-start"
              onClick={() => setAssigning(true)}
            >
              <Plus className="size-4" />
              {detail.assign}
            </Button>
          )}
        </div>
      )}

      {assigning ? (
        <AssignForm
          userId={userId}
          programs={programs}
          replacing={Boolean(assignment)}
          lang={lang}
          copy={copy}
          today={today}
          onDone={() => setAssigning(false)}
        />
      ) : null}
    </Surface>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
        {label}
      </dt>
      <dd className="text-ink-200 sm:mt-0.5">{children}</dd>
    </div>
  );
}

function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: AssignmentView["status"];
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        status === "active" && "border-brand-500/25 bg-brand-500/12 text-brand-200",
        status === "paused" && "border-amber-400/25 bg-amber-400/10 text-amber-200",
        status === "completed" && "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
        status === "cancelled" && "border-white/10 bg-white/5 text-ink-400",
      )}
    >
      {label}
    </span>
  );
}

function ErrorLine({ state, copy }: { state: ClientState; copy: ClientsCopy }) {
  if (state.status !== "error" || !state.code) return null;

  return (
    <p role="alert" className="text-[13px] text-rose-300">
      {copy.errors[state.code]}
    </p>
  );
}

function AssignForm({
  userId,
  programs,
  replacing,
  lang,
  copy,
  today,
  onDone,
}: {
  userId: string;
  programs: ProgramOption[];
  replacing: boolean;
  lang: Locale;
  copy: ClientsCopy;
  today: DayKey;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(assignProgramAction, CLIENT_IDLE);
  const detail = copy.detail;

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  if (programs.length === 0) {
    return (
      <Surface tone="bare" className="flex items-center justify-between gap-3 p-4">
        <p className="text-[13px] text-ink-400">{detail.programEmpty}</p>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {detail.cancel}
        </Button>
      </Surface>
    );
  }

  return (
    <Surface tone="bare" className="flex flex-col gap-4 p-5">
      <h3 className="text-[14px] font-semibold text-ink-100">
        {detail.assignHeading}
      </h3>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="userId" value={userId} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {detail.program}
            </span>
            <select
              name="programId"
              defaultValue={programs[0]?.id}
              className={cn(fieldControl, "px-3")}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {translate(program.title, lang)}
                  {program.isPublished ? "" : ` · ${detail.programDraft}`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {detail.startDate}
            </span>
            <input
              type="date"
              name="startDate"
              defaultValue={today}
              required
              className={cn(fieldControl, "px-3")}
            />
            <span className="text-[12px] text-ink-500">{detail.startDateHint}</span>
          </label>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {detail.assignNote}
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={NOTE_MAX}
            className={cn(fieldControl, "h-auto py-3 leading-relaxed")}
          />
          <span className="text-[12px] text-ink-500">{detail.assignNoteHint}</span>
        </label>

        <ErrorLine state={state} copy={copy} />

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            onClick={(event) => {
              if (replacing && !confirm(detail.confirmReplace)) {
                event.preventDefault();
              }
            }}
          >
            {pending ? detail.saving : detail.save}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            {detail.cancel}
          </Button>
        </div>
      </form>
    </Surface>
  );
}

function MoveForm({
  assignmentId,
  startDate,
  copy,
  onDone,
}: {
  assignmentId: string;
  startDate: DayKey;
  copy: ClientsCopy;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(moveAssignmentAction, CLIENT_IDLE);
  const detail = copy.detail;

  useEffect(() => {
    if (state.status === "saved") onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {detail.startDate}
          </span>
          <input
            type="date"
            name="startDate"
            defaultValue={startDate}
            required
            className={cn(fieldControl, "px-3")}
          />
        </label>

        <input type="hidden" name="assignmentId" value={assignmentId} />

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? detail.saving : detail.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {detail.cancel}
        </Button>
      </div>

      <p className="text-[12px] text-ink-500">{detail.moveHint}</p>
      <ErrorLine state={state} copy={copy} />
    </form>
  );
}
