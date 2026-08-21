"use client";

import { CalendarRange, ChevronRight, MailWarning, Search, StickyNote } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { fieldControl } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { translate } from "@/db/schema/i18n";
import type { ClientsCopy } from "@/lib/clients/copy";
import { plural } from "@/lib/clients/copy";
import {
  displayName,
  formatNumber,
  formatRelativeDay,
  initials,
} from "@/lib/clients/format";
import { dayKeyOf, daysBetween, type DayKey } from "@/lib/clients/schedule";
import type { ClientSummary } from "@/lib/clients/types";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type Filter = "all" | "assigned" | "unassigned" | "idle";

/** No finished workout in this many days counts as gone quiet. */
const IDLE_DAYS = 14;

export function ClientList({
  clients,
  lang,
  copy,
  today,
  timeZone,
}: {
  clients: ClientSummary[];
  lang: Locale;
  copy: ClientsCopy;
  today: DayKey;
  timeZone: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const tag = localeTags[lang];
  const term = query.trim().toLowerCase();

  const matches = useMemo(() => {
    return clients.filter((client) => {
      const active = client.plan?.status === "active";

      if (filter === "assigned" && !active) return false;
      if (filter === "unassigned" && client.plan) return false;
      if (filter === "idle" && !isIdle(client, today, timeZone)) return false;

      if (!term) return true;

      const haystack = [client.fullName ?? "", client.email ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clients, filter, term, today, timeZone]);

  const assigned = clients.filter((c) => c.plan?.status === "active").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.list.search}
            aria-label={copy.list.search}
            className={cn(fieldControl, "h-11 pl-10 text-[14px]")}
          />
        </div>

        <div className="flex rounded-control border border-white/10 bg-white/4 p-1">
          {(
            [
              ["all", copy.list.filterAll],
              ["assigned", copy.list.filterAssigned],
              ["unassigned", copy.list.filterUnassigned],
              ["idle", copy.list.filterIdle],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "rounded-[calc(var(--radius-control)-0.25rem)] px-3 py-2 text-[13px] font-medium transition-colors",
                filter === value
                  ? "bg-brand-500/16 text-brand-100"
                  : "text-ink-400 hover:text-ink-100",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[13px] text-ink-500">
        {plural(copy.list.count, clients.length, tag)}
        {clients.length > 0
          ? ` · ${copy.list.assignedOf.replace("{a}", formatNumber(assigned, tag))}`
          : ""}
      </p>

      {matches.length === 0 ? (
        <Surface tone="bare" className="p-6">
          <p className="text-[14px] text-ink-300">
            {clients.length === 0 ? copy.list.empty : copy.list.emptyFiltered}
          </p>
          {clients.length === 0 ? (
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-ink-500">
              {copy.list.emptyHint}
            </p>
          ) : null}
        </Surface>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {matches.map((client) => (
            <li key={client.id}>
              <Row client={client} lang={lang} copy={copy} today={today} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isIdle(client: ClientSummary, today: DayKey, timeZone: string): boolean {
  if (!client.lastSessionAt) return true;

  const day = dayKeyOf(new Date(client.lastSessionAt), timeZone);
  return daysBetween(day, today) >= IDLE_DAYS;
}

function Row({
  client,
  lang,
  copy,
  today,
}: {
  client: ClientSummary;
  lang: Locale;
  copy: ClientsCopy;
  today: DayKey;
}) {
  const tag = localeTags[lang];
  const name = displayName(client.fullName, client.email);

  const last = client.lastSessionAt
    ? formatRelativeDay(
        // The list only needs the day, and the exact zone matters less here
        // than in the schedule — this is "roughly when", not a streak.
        new Date(client.lastSessionAt).toISOString().slice(0, 10),
        today,
        tag,
      )
    : copy.list.never;

  return (
    <Surface
      as={Link}
      href={`/${lang}/admin/clients/${client.id}`}
      className="group flex items-center gap-4 p-4 transition-colors hover:border-white/16"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/6 text-[13px] font-semibold text-ink-200">
        {initials(client.fullName, client.email)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-[15px] font-semibold text-ink-50">{name}</p>

          {client.emailConfirmed ? null : (
            <span
              title={copy.list.notConfirmed}
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-amber-200"
            >
              <MailWarning className="size-3" />
              {copy.list.notConfirmed}
            </span>
          )}
        </div>

        {client.fullName && client.email ? (
          <p className="truncate text-[12px] text-ink-500">{client.email}</p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-400">
          {client.plan ? (
            <span className="inline-flex items-center gap-1.5 text-brand-200">
              <CalendarRange className="size-3.5" />
              <span className="truncate">
                {translate(client.plan.programTitle, lang)}
              </span>
              {client.plan.status === "active" ? null : (
                <span className="text-ink-500">
                  · {copy.statuses[client.plan.status].toLowerCase()}
                </span>
              )}
            </span>
          ) : (
            <span className="text-ink-500">{copy.list.noPlan}</span>
          )}

          <span>
            {copy.list.lastSession}: {last}
          </span>

          {client.noteCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-ink-500">
              <StickyNote className="size-3.5" />
              {formatNumber(client.noteCount, tag)}
            </span>
          ) : null}
        </div>
      </div>

      <ChevronRight className="size-4 shrink-0 text-ink-500 transition-transform group-hover:translate-x-0.5" />
    </Surface>
  );
}
