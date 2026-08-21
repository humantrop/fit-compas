"use client";

import {
  Bell,
  CalendarClock,
  Clock,
  Mail,
  Pause,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { localeTags, type Locale } from "@/lib/i18n/config";
import {
  checkScheduleAction,
  deleteMessageAction,
  sendMessageNowAction,
  toggleMessageAction,
} from "@/lib/notifications/actions";
import {
  fill,
  plural,
  type NotificationsCopy,
} from "@/lib/notifications/copy";
import {
  NOTIFICATION_IDLE,
  type MessageView,
  type NotificationState,
} from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * What has been sent and what is still coming.
 *
 * One list rather than two tabs. A repeating reminder is both — it has sent
 * eleven times and will send again on Friday — and splitting the screen would
 * force it into one column or duplicate it into both.
 *
 * Every row shows how many people the last run reached. Without it a message
 * that matched nobody (an empty audience, a paused plan) looks exactly like one
 * that reached everybody, and the failure is silent for as long as nobody
 * happens to ask a client whether they got it.
 */
export function MessageList({
  messages,
  lang,
  copy,
}: {
  messages: MessageView[];
  lang: Locale;
  copy: NotificationsCopy;
}) {
  const list = copy.list;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink-100">{list.heading}</h2>
        <CheckButton copy={copy} lang={lang} />
      </div>

      {messages.length === 0 ? (
        <Surface className="flex flex-col gap-1.5 p-6">
          <p className="text-[14px] text-ink-300">{list.empty}</p>
          <p className="text-[13px] leading-relaxed text-ink-500">
            {list.emptyHint}
          </p>
        </Surface>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {messages.map((message) => (
            <li key={message.id}>
              <MessageRow message={message} lang={lang} copy={copy} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Runs a dispatch pass by hand.
 *
 * Here rather than hidden in a settings screen because the cron cadence is
 * invisible from inside the app — on a Hobby plan Vercel fires the job once a
 * day, and this is the difference between "it will go out eventually" and being
 * able to see that it did.
 */
function CheckButton({ copy, lang }: { copy: NotificationsCopy; lang: Locale }) {
  const [state, action, pending] = useActionState<NotificationState, FormData>(
    checkScheduleAction,
    NOTIFICATION_IDLE,
  );

  return (
    <form action={action} className="flex items-center gap-3">
      {state.status === "sent" ? (
        <span className="text-[12px] text-ink-400">
          {plural(
            copy.list.sentToast,
            state.recipients ?? 0,
            localeTags[lang],
          )}
        </span>
      ) : null}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        <RefreshCw className={cn("size-4", pending && "animate-spin")} />
        {pending ? copy.list.checking : copy.list.checkNow}
      </Button>
    </form>
  );
}

function MessageRow({
  message,
  lang,
  copy,
}: {
  message: MessageView;
  lang: Locale;
  copy: NotificationsCopy;
}) {
  const list = copy.list;
  const tag = localeTags[lang];

  const Icon = message.kind === "reminder" ? Clock : Bell;
  const title =
    message.title[lang] ??
    message.title.sr ??
    Object.values(message.title).find(Boolean) ??
    "";

  return (
    <Surface className="flex flex-col gap-3.5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Icon className="mt-0.5 size-4.5 shrink-0 text-brand-300" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink-100">
              {title}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-500">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" />
                {message.audience === "one"
                  ? fill(list.audienceOne, {
                      name: message.audienceName ?? "—",
                    })
                  : copy.compose.audiences[message.audience]}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {describeSchedule(message, copy)}
              </span>
              {message.viaEmail ? (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-3.5" />
                    {list.email}
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>

        <StatusBadge message={message} copy={copy} />
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
        <Stat
          label={list.next}
          value={
            message.nextRunAt && message.status === "scheduled"
              ? formatMoment(message.nextRunAt, tag, message.timeZone)
              : "—"
          }
        />
        <Stat
          label={list.lastRun}
          value={
            message.lastRunAt
              ? formatMoment(message.lastRunAt, tag, message.timeZone)
              : list.never
          }
        />
        <Stat
          label={plural(list.runs, message.runCount, tag)}
          value={
            message.delivered > 0
              ? `${plural(list.delivered, message.delivered, tag)} · ${fill(
                  list.readOf,
                  { read: message.read },
                )}`
              : plural(list.delivered, 0, tag)
          }
        />
      </dl>

      <div className="flex flex-wrap gap-2">
        <RowAction
          messageId={message.id}
          action={sendMessageNowAction}
          idle={list.sendNow}
          busy={list.sending}
          icon={<Send className="size-3.5" />}
          copy={copy}
          lang={lang}
        />

        {message.repeat !== "once" || message.status === "scheduled" ? (
          <RowAction
            messageId={message.id}
            action={toggleMessageAction}
            idle={message.status === "paused" ? list.resume : list.pause}
            busy={list.sending}
            icon={
              message.status === "paused" ? (
                <Play className="size-3.5" />
              ) : (
                <Pause className="size-3.5" />
              )
            }
            copy={copy}
            lang={lang}
          />
        ) : null}

        <RowAction
          messageId={message.id}
          action={deleteMessageAction}
          idle={list.remove}
          busy={list.sending}
          icon={<Trash2 className="size-3.5" />}
          confirm={list.confirmRemove}
          copy={copy}
          lang={lang}
          danger
        />
      </div>
    </Surface>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-200">{value}</dd>
    </div>
  );
}

function StatusBadge({
  message,
  copy,
}: {
  message: MessageView;
  copy: NotificationsCopy;
}) {
  const tones: Record<MessageView["status"], string> = {
    scheduled: "border-brand-500/25 bg-brand-500/10 text-brand-200",
    paused: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    sent: "border-white/10 bg-white/5 text-ink-300",
    cancelled: "border-white/10 bg-white/5 text-ink-500",
  };

  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        tones[message.status],
      )}
    >
      {copy.list.statuses[message.status]}
    </span>
  );
}

/**
 * One button, one action, one pending state.
 *
 * A component per button rather than a shared `useActionState` for the row:
 * three actions sharing one state would make "Send now" flash the spinner on
 * "Delete" — and worse, a failure from one would render under the other.
 */
function RowAction({
  messageId,
  action,
  idle,
  busy,
  icon,
  confirm,
  copy,
  lang,
  danger = false,
}: {
  messageId: string;
  action: (
    state: NotificationState,
    formData: FormData,
  ) => Promise<NotificationState>;
  idle: string;
  busy: string;
  icon: React.ReactNode;
  confirm?: string;
  copy: NotificationsCopy;
  lang: Locale;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState<NotificationState, FormData>(
    action,
    NOTIFICATION_IDLE,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="messageId" value={messageId} />
      <Button
        type="submit"
        variant="secondary"
        size="sm"
        disabled={pending}
        className={cn(danger && "text-rose-200 hover:text-rose-100")}
      >
        {icon}
        {pending ? busy : idle}
      </Button>

      {state.status === "sent" ? (
        <span className="text-[12px] text-ink-400">
          {plural(copy.list.sentToast, state.recipients ?? 0, localeTags[lang])}
        </span>
      ) : null}

      {state.status === "error" && state.code ? (
        <span role="alert" className="text-[12px] text-rose-300">
          {copy.errors[state.code]}
        </span>
      ) : null}
    </form>
  );
}

/* --------------------------------------------------------------- helpers */

function formatMoment(iso: string, localeTag: string, timeZone: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

/** "Every day at 09:00", "Mon, Wed, Fri at 18:30", "Once at 14:00". */
function describeSchedule(
  message: MessageView,
  copy: NotificationsCopy,
): string {
  const list = copy.list;
  const time = message.timeOfDay ?? "";

  if (message.repeat === "daily") {
    return fill(list.scheduleDaily, { time });
  }

  if (message.repeat === "weekly") {
    const names = message.repeatDays
      .map((day) => copy.compose.weekdays[day - 1])
      .filter(Boolean)
      .join(", ");
    return fill(list.scheduleWeekly, { days: names, time });
  }

  return time
    ? `${list.scheduleOnce} ${fill(list.scheduleAt, { time })}`
    : list.scheduleOnce;
}
