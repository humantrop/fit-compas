"use client";

import { Bell, Clock, Mail, Send } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { locales, localeTags, type Locale } from "@/lib/i18n/config";
import { createMessageAction } from "@/lib/notifications/actions";
import {
  fill,
  type NotificationsCopy,
  type WhenChoice,
} from "@/lib/notifications/copy";
import {
  instantAt,
  nextRun,
  parseTimeOfDay,
} from "@/lib/notifications/schedule";
import {
  BODY_MAX,
  HREF_TARGETS,
  NOTIFICATION_IDLE,
  TITLE_MAX,
  type ClientOption,
  type NotificationState,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * Writing one message.
 *
 * Three things here are deliberate.
 *
 * **All three languages are always in the DOM**, hidden rather than unmounted,
 * so switching tabs cannot lose what was typed. The same arrangement the
 * exercise editor uses, for the same reason it was made there.
 *
 * **The schedule preview runs the real function.** `nextRun` is the module the
 * dispatcher advances the cursor with, imported here rather than approximated,
 * so the line under the form cannot promise a Monday the server would not
 * honour. It is why that module has no server imports.
 *
 * **Audience is picked as a rule, never as a list of people.** The database
 * stores the rule and re-resolves it at every send; a picker that expanded
 * "everyone who went quiet" into ticked boxes would freeze the answer on the
 * day it was written, which is the one thing that audience must not do.
 */

const WHEN_CHOICES: WhenChoice[] = ["now", "once", "daily", "weekly"];

/** ISO weekdays, Monday first — the order `copy.compose.weekdays` is written in. */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export function MessageComposer({
  lang,
  copy,
  clients,
  timeZone,
  today,
  now,
  mailConfigured,
}: {
  lang: Locale;
  copy: NotificationsCopy;
  clients: ClientOption[];
  timeZone: string;
  /** The admin's own calendar day, so the date fields cannot open in the past. */
  today: string;
  /**
   * The instant the page rendered, ISO, from the server.
   *
   * The preview line needs a "now" to count forward from, and `new Date()`
   * during render is a different value on the server than in the browser a
   * moment later — a hydration mismatch on the one piece of text the trainer
   * is reading. Handing it down freezes it for both.
   */
  now: string;
  mailConfigured: boolean;
}) {
  const compose = copy.compose;

  const [state, action, pending] = useActionState<NotificationState, FormData>(
    createMessageAction,
    NOTIFICATION_IDLE,
  );

  const [tab, setTab] = useState<Locale>("sr");
  const [text, setText] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<"announcement" | "reminder">("announcement");
  const [when, setWhen] = useState<WhenChoice>("now");
  const [audience, setAudience] = useState<string>("all");
  const [days, setDays] = useState<number[]>([1, 3, 5]);
  const [time, setTime] = useState("09:00");
  const [date, setDate] = useState(today);
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [viaEmail, setViaEmail] = useState(false);

  // Same trick as the coach-notes form: `useActionState` hands back a new
  // object per submit, so comparing identity catches the transition exactly
  // once, during render, before anything is painted. Leaving the text sitting
  // in the boxes above the message it just sent reads as a failed send.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.status === "saved" || state.status === "sent") {
      setText({});
      setViaEmail(false);
    }
  }

  const value = (field: string) => text[field] ?? "";
  const set = (field: string, next: string) =>
    setText((current) => ({ ...current, [field]: next }));

  const preview = previewOf({
    when,
    time,
    date,
    days,
    startsOn,
    endsOn,
    timeZone,
    now: new Date(now),
  });

  return (
    <Surface edge className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-2.5">
        {kind === "reminder" ? (
          <Clock className="size-4.5 text-brand-300" />
        ) : (
          <Bell className="size-4.5 text-brand-300" />
        )}
        <h2 className="text-[15px] font-semibold text-ink-100">{compose.heading}</h2>
      </div>

      <form action={action} className="flex flex-col gap-6">
        {/* ---------------------------------------------------------- kind */}
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">
            {compose.kindLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {(["announcement", "reminder"] as const).map((option) => (
              <Choice
                key={option}
                checked={kind === option}
                onSelect={() => setKind(option)}
                label={compose.kinds[option]}
              />
            ))}
          </div>
          <input type="hidden" name="kind" value={kind} />
          <p className="text-[12px] text-ink-500">{compose.kindHint}</p>
        </div>

        {/* ------------------------------------------------------- the text */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {compose.titleLabel}
            </span>
            <div className="flex gap-1">
              {locales.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setTab(locale)}
                  aria-pressed={tab === locale}
                  className={cn(
                    "rounded-control px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors",
                    tab === locale
                      ? "bg-brand-500/15 text-brand-100"
                      : "text-ink-500 hover:bg-white/6 hover:text-ink-200",
                  )}
                >
                  {locale}
                </button>
              ))}
            </div>
          </div>

          {locales.map((locale) => (
            <div
              key={locale}
              hidden={tab !== locale}
              className="flex flex-col gap-3"
            >
              <input
                name={`title_${locale}`}
                value={value(`title_${locale}`)}
                onChange={(event) => set(`title_${locale}`, event.target.value)}
                maxLength={TITLE_MAX}
                placeholder={compose.titlePlaceholder}
                aria-label={`${compose.titleLabel} (${locale})`}
                className={fieldControl}
              />
              <textarea
                name={`body_${locale}`}
                value={value(`body_${locale}`)}
                onChange={(event) => set(`body_${locale}`, event.target.value)}
                rows={4}
                maxLength={BODY_MAX}
                placeholder={compose.bodyPlaceholder}
                aria-label={`${compose.bodyLabel} (${locale})`}
                className={cn(fieldControl, "h-auto py-3 leading-relaxed")}
              />
            </div>
          ))}

          <p className="text-[12px] text-ink-500">{compose.languageHint}</p>
        </div>

        {/* -------------------------------------------------------- target */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {compose.hrefLabel}
            </span>
            <select name="href" defaultValue="/dashboard" className={fieldControl}>
              {HREF_TARGETS.map((target) => (
                <option key={target || "none"} value={target}>
                  {compose.hrefTargets[target]}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-ink-500">{compose.hrefHint}</span>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {compose.audienceLabel}
            </span>
            <select
              name="audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              className={fieldControl}
            >
              {(
                ["all", "active_plan", "no_plan", "idle", "one"] as const
              ).map((option) => (
                <option key={option} value={option}>
                  {compose.audiences[option]}
                </option>
              ))}
            </select>
            <span className="text-[12px] text-ink-500">{compose.audienceHint}</span>
          </label>
        </div>

        {audience === "one" ? (
          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-300">
              {compose.clientLabel}
            </span>
            {clients.length === 0 ? (
              <p className="text-[13px] text-ink-500">{compose.clientEmpty}</p>
            ) : (
              <select name="clientId" className={fieldControl}>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            )}
          </label>
        ) : null}

        {/* ---------------------------------------------------------- when */}
        <div className="flex flex-col gap-3">
          <span className="text-[13px] font-medium text-ink-300">
            {compose.whenLabel}
          </span>
          <div className="flex flex-wrap gap-2">
            {WHEN_CHOICES.map((option) => (
              <Choice
                key={option}
                checked={when === option}
                onSelect={() => setWhen(option)}
                label={compose.when[option]}
              />
            ))}
          </div>
          <input type="hidden" name="when" value={when} />

          {when !== "now" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {when === "once" ? (
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-medium text-ink-300">
                    {compose.dateLabel}
                  </span>
                  <input
                    type="date"
                    name="date"
                    min={today}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className={fieldControl}
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ink-300">
                  {compose.timeLabel}
                </span>
                <input
                  type="time"
                  name="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={fieldControl}
                />
                <span className="text-[12px] text-ink-500">
                  {fill(compose.zoneNote, { zone: timeZone })}
                </span>
              </label>
            </div>
          ) : null}

          {when === "weekly" ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-300">
                {compose.weekdaysLabel}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day, index) => {
                  const on = days.includes(day);
                  return (
                    <label
                      key={day}
                      className={cn(
                        "cursor-pointer rounded-control border px-3 py-2 text-[13px] font-semibold transition-colors",
                        on
                          ? "border-brand-500/30 bg-brand-500/12 text-brand-100"
                          : "border-white/10 bg-white/4 text-ink-400 hover:text-ink-200",
                      )}
                    >
                      <input
                        type="checkbox"
                        name="days"
                        value={day}
                        checked={on}
                        onChange={() =>
                          setDays((current) =>
                            current.includes(day)
                              ? current.filter((value) => value !== day)
                              : [...current, day],
                          )
                        }
                        className="sr-only"
                      />
                      {compose.weekdays[index]}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {when === "daily" || when === "weekly" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ink-300">
                  {compose.startsLabel}
                </span>
                <input
                  type="date"
                  name="startsOn"
                  min={today}
                  value={startsOn}
                  onChange={(event) => setStartsOn(event.target.value)}
                  className={fieldControl}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[13px] font-medium text-ink-300">
                  {compose.endsLabel}
                </span>
                <input
                  type="date"
                  name="endsOn"
                  min={startsOn || today}
                  value={endsOn}
                  onChange={(event) => setEndsOn(event.target.value)}
                  className={fieldControl}
                />
                <span className="text-[12px] text-ink-500">{compose.endsHint}</span>
              </label>
            </div>
          ) : null}

          {when !== "now" ? (
            <p className="text-[13px] text-ink-400">
              <span className="text-ink-500">{compose.previewLabel}: </span>
              {preview
                ? new Intl.DateTimeFormat(localeTags[lang], {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone,
                  }).format(preview)
                : compose.previewNone}
            </p>
          ) : null}
        </div>

        {/* --------------------------------------------------------- email */}
        <label
          className={cn(
            "flex items-start gap-3 rounded-control border border-white/8 bg-white/3 p-3.5",
            !mailConfigured && "opacity-60",
          )}
        >
          <input
            type="checkbox"
            name="viaEmail"
            checked={viaEmail}
            disabled={!mailConfigured}
            onChange={(event) => setViaEmail(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--color-brand-500)]"
          />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink-200">
              <Mail className="size-3.5" />
              {compose.emailLabel}
            </span>
            <span className="text-[12px] text-ink-500">
              {mailConfigured ? compose.emailHint : copy.mail.missingHint}
            </span>
          </span>
        </label>

        {state.status === "error" && state.code ? (
          <p role="alert" className="text-[13px] text-rose-300">
            {copy.errors[state.code]}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || !value("title_sr").trim()}>
            <Send className="size-4" />
            {pending
              ? compose.saving
              : when === "now"
                ? compose.submitNow
                : compose.submitSchedule}
          </Button>

          {Object.keys(text).length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setText({})}
            >
              {compose.reset}
            </Button>
          ) : null}
        </div>
      </form>
    </Surface>
  );
}

/** A radio in everything but markup — the label is the target, not a dot. */
function Choice({
  checked,
  onSelect,
  label,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={checked}
      className={cn(
        "h-10 rounded-control border px-4 text-[13px] font-semibold transition-colors",
        checked
          ? "border-brand-500/30 bg-brand-500/12 text-brand-100"
          : "border-white/10 bg-white/4 text-ink-400 hover:text-ink-200",
      )}
    >
      {label}
    </button>
  );
}

/** The first instant this schedule would fire, or null if it never would. */
function previewOf({
  when,
  time,
  date,
  days,
  startsOn,
  endsOn,
  timeZone,
  now,
}: {
  when: WhenChoice;
  time: string;
  date: string;
  days: number[];
  startsOn: string;
  endsOn: string;
  timeZone: string;
  now: Date;
}): Date | null {
  const minutes = parseTimeOfDay(time);
  if (minutes === null) return null;

  if (when === "now") return now;
  if (when === "once") return date ? instantAt(date, minutes, timeZone) : null;

  return nextRun(
    {
      repeat: when,
      minutes,
      timeZone,
      days,
      startsOn: startsOn || null,
      endsOn: endsOn || null,
      at: null,
    },
    now,
  );
}
