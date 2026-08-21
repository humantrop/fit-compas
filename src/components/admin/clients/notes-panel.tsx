"use client";

import { Lock, Pin, PinOff, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import {
  deleteNoteAction,
  saveNoteAction,
  toggleNotePinAction,
} from "@/lib/clients/actions";
import type { ClientsCopy } from "@/lib/clients/copy";
import { formatMoment } from "@/lib/clients/format";
import { CLIENT_IDLE, NOTE_MAX, type ClientState, type NoteView } from "@/lib/clients/types";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Coach notes. The lock in the header is not decoration — these rows have no
 * RLS policy that lets their subject read them, and no client screen queries
 * the table. Saying so on the screen is what makes the trainer willing to write
 * the honest version.
 */
export function NotesPanel({
  userId,
  notes,
  lang,
  copy,
  timeZone,
}: {
  userId: string;
  notes: NoteView[];
  lang: Locale;
  copy: ClientsCopy;
  timeZone: string;
}) {
  const detail = copy.detail;

  return (
    <Surface className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-ink-100">
          {detail.notesHeading}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
          <Lock className="size-3" />
          {detail.notesPrivate}
        </span>
      </div>

      <NoteForm userId={userId} copy={copy} />

      {notes.length === 0 ? (
        <p className="text-[13px] text-ink-500">{detail.notesEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteRow note={note} lang={lang} copy={copy} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      )}
    </Surface>
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

function NoteForm({ userId, copy }: { userId: string; copy: ClientsCopy }) {
  const [state, action, pending] = useActionState(saveNoteAction, CLIENT_IDLE);
  const [body, setBody] = useState("");
  const detail = copy.detail;

  // Clearing on success rather than relying on the form reset: the action
  // refreshes the route, and a stale draft sitting in a textarea above the note
  // it just created reads as a failed save.
  //
  // Adjusted during render rather than in an effect, which is what React
  // recommends for state that follows another value: `useActionState` hands
  // back a new object per submit, so comparing identity catches the transition
  // exactly once and re-renders before anything is painted.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "saved") setBody("");
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="userId" value={userId} />

      <textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={NOTE_MAX}
        placeholder={detail.notePlaceholder}
        aria-label={detail.noteAdd}
        className={cn(fieldControl, "h-auto py-3 leading-relaxed")}
      />

      <ErrorLine state={state} copy={copy} />

      <Button
        type="submit"
        size="sm"
        variant="secondary"
        className="self-start"
        disabled={pending || !body.trim()}
      >
        {pending ? detail.saving : detail.noteAdd}
      </Button>
    </form>
  );
}

function NoteRow({
  note,
  lang,
  copy,
  timeZone,
}: {
  note: NoteView;
  lang: Locale;
  copy: ClientsCopy;
  timeZone: string;
}) {
  const [editing, setEditing] = useState(false);
  const detail = copy.detail;
  const tag = localeTags[lang];

  const [saveState, saveAction, savePending] = useActionState(
    saveNoteAction,
    CLIENT_IDLE,
  );
  const [pinState, pinAction, pinPending] = useActionState(
    toggleNotePinAction,
    CLIENT_IDLE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteNoteAction,
    CLIENT_IDLE,
  );

  // Same render-time transition as `NoteForm` above: a save that went through
  // closes the editor, without an effect that would paint the open form first.
  const [seenSave, setSeenSave] = useState(saveState);
  if (seenSave !== saveState) {
    setSeenSave(saveState);
    if (saveState.status === "saved") setEditing(false);
  }

  const created = formatMoment(note.createdAt, tag, timeZone);
  const edited = note.updatedAt !== note.createdAt;

  return (
    <Surface
      tone="bare"
      className={cn(
        "flex flex-col gap-2.5 p-4",
        note.pinned && "border-brand-500/20 bg-brand-500/6",
      )}
    >
      {editing ? (
        <form action={saveAction} className="flex flex-col gap-3">
          <input type="hidden" name="noteId" value={note.id} />
          <textarea
            name="body"
            defaultValue={note.body}
            rows={4}
            maxLength={NOTE_MAX}
            className={cn(fieldControl, "h-auto py-3 leading-relaxed")}
          />

          <ErrorLine state={saveState} copy={copy} />

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={savePending}>
              {savePending ? detail.saving : detail.save}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              {detail.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-200">
          {note.body}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
        {note.pinned ? (
          <span className="font-semibold uppercase tracking-[0.1em] text-brand-300">
            {detail.notePinned}
          </span>
        ) : null}

        {created ? <span>{created}</span> : null}
        {edited ? <span>· {detail.noteEdited}</span> : null}

        <span className="ml-auto flex items-center gap-1">
          {editing ? null : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-control px-2 py-1 text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
            >
              {detail.noteEdit}
            </button>
          )}

          <form action={pinAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <button
              type="submit"
              disabled={pinPending}
              title={note.pinned ? detail.noteUnpin : detail.notePin}
              aria-label={note.pinned ? detail.noteUnpin : detail.notePin}
              className="grid size-7 place-items-center rounded-control text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100"
            >
              {note.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
            </button>
          </form>

          <form action={deleteAction}>
            <input type="hidden" name="noteId" value={note.id} />
            <button
              type="submit"
              disabled={deletePending}
              title={detail.noteDelete}
              aria-label={detail.noteDelete}
              onClick={(event) => {
                if (!confirm(detail.noteConfirmDelete)) event.preventDefault();
              }}
              className="grid size-7 place-items-center rounded-control text-ink-400 transition-colors hover:bg-rose-500/12 hover:text-rose-300"
            >
              <Trash2 className="size-3.5" />
            </button>
          </form>
        </span>
      </div>

      <ErrorLine state={pinState} copy={copy} />
      <ErrorLine state={deleteState} copy={copy} />
    </Surface>
  );
}
