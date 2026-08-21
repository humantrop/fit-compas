"use client";

import { Bell, CalendarRange, CheckCheck, Clock, Info } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Surface } from "@/components/ui/surface";
import { localeTags, type Locale } from "@/lib/i18n/config";
import {
  markAllReadAction,
  openNotificationAction,
} from "@/lib/notifications/actions";
import { plural, type NotificationsCopy } from "@/lib/notifications/copy";
import type { Inbox, InboxItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

/**
 * The client's inbox.
 *
 * Every row is a form, not a link. Opening a notification does two things —
 * marks it read and goes where it points — and a link would only do the second,
 * leaving the badge on the bell counting things the reader has already seen.
 * The server action does both and redirects, so it works with no JavaScript at
 * all: this screen gets opened in a gym, on a phone, on two bars of signal.
 *
 * Nothing is marked read just by the page rendering. Somebody who opens the
 * inbox, sees four new messages and puts the phone back in their pocket has not
 * read them, and a badge that clears on a glance is a badge nobody trusts.
 */
export function InboxList({
  inbox,
  lang,
  copy,
  timeZone,
}: {
  inbox: Inbox;
  lang: Locale;
  copy: NotificationsCopy;
  /** The reader's zone, from the cookie the timezone probe writes. */
  timeZone: string;
}) {
  const text = copy.inbox;

  if (!inbox.available) {
    return (
      <Surface className="p-6">
        <p className="text-[14px] text-ink-400">{text.unavailable}</p>
      </Surface>
    );
  }

  if (inbox.items.length === 0) {
    return (
      <Surface className="flex flex-col gap-1.5 p-6">
        <p className="text-[14px] text-ink-300">{text.empty}</p>
        <p className="text-[13px] leading-relaxed text-ink-500">
          {text.emptyHint}
        </p>
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-400">
          {inbox.unread > 0
            ? plural(text.unreadBadge, inbox.unread, localeTags[lang])
            : text.allRead}
        </p>

        {inbox.unread > 0 ? (
          <form action={markAllReadAction}>
            <MarkAllButton copy={copy} />
          </form>
        ) : null}
      </div>

      <ul className="flex flex-col gap-2">
        {inbox.items.map((item) => (
          <li key={item.id}>
            <Row item={item} lang={lang} copy={copy} timeZone={timeZone} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MarkAllButton({ copy }: { copy: NotificationsCopy }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-2 rounded-control px-3 text-[13px] font-semibold text-ink-400 transition-colors hover:bg-white/6 hover:text-ink-100 disabled:opacity-50"
    >
      <CheckCheck className="size-4" />
      {pending ? copy.inbox.marking : copy.inbox.markAll}
    </button>
  );
}

const ICONS = {
  announcement: Bell,
  reminder: Clock,
  plan: CalendarRange,
  system: Info,
} as const;

function Row({
  item,
  lang,
  copy,
  timeZone,
}: {
  item: InboxItem;
  lang: Locale;
  copy: NotificationsCopy;
  timeZone: string;
}) {
  const unread = item.readAt === null;
  const Icon = ICONS[item.kind];

  return (
    <form action={openNotificationAction}>
      <input type="hidden" name="notificationId" value={item.id} />
      <input type="hidden" name="lang" value={lang} />

      <RowButton unread={unread}>
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-control",
            unread
              ? "bg-brand-500/15 text-brand-200"
              : "bg-white/5 text-ink-500",
          )}
        >
          <Icon className="size-4.5" />
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline justify-between gap-3">
            <span
              className={cn(
                "truncate text-[14px] font-semibold",
                unread ? "text-ink-50" : "text-ink-300",
              )}
            >
              {item.title}
            </span>
            <span className="shrink-0 text-[11px] text-ink-500">
              {formatMoment(item.createdAt, localeTags[lang], timeZone)}
            </span>
          </span>

          {item.body ? (
            <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-400">
              {item.body}
            </span>
          ) : null}

          <span className="flex items-center gap-2 text-[11px] text-ink-500">
            <span>{copy.inbox.kinds[item.kind]}</span>
            {unread ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-brand-300">{copy.inbox.unreadDot}</span>
              </>
            ) : null}
          </span>
        </span>
      </RowButton>
    </form>
  );
}

/**
 * The row itself. Separate so `useFormStatus` can read the submission of the
 * form it sits inside — the hook only sees a form from a child component.
 */
function RowButton({
  unread,
  children,
}: {
  unread: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors",
        unread
          ? "border-brand-500/20 bg-brand-500/6 hover:bg-brand-500/10"
          : "border-white/8 bg-white/3 hover:bg-white/6",
        pending && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function formatMoment(iso: string, localeTag: string, timeZone: string): string {
  return new Intl.DateTimeFormat(localeTag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
