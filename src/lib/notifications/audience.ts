import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { NotificationAudience } from "@/db/schema/notifications";
import { isLocale, type Locale } from "@/lib/i18n/config";

import { IDLE_AFTER_DAYS } from "./types";

/**
 * Turning an audience rule into the people it currently means.
 *
 * Run at every dispatch rather than stored, which is the whole reason the rule
 * is a rule. A weekly "you have gone quiet" reminder addressed to a list frozen
 * at composition time would keep nagging the people who came back and miss
 * everyone who left since — the two groups the message is actually about.
 *
 * Everything here is scoped to `role = 'client'`. The trainer is a row in the
 * same table and would otherwise receive their own broadcast, which reads as a
 * bug the first time it happens and as noise every time after.
 */

export type Recipient = {
  id: string;
  /** Their app language, already validated. Serbian when unset or unknown. */
  locale: Locale;
  /** Null when the address is unreadable — the in-app notification still goes. */
  email: string | null;
  /**
   * Their own answer to "do I want email from this app" (feature 16), from
   * `profiles.email_notifications`. Separate from the trainer's per-message
   * `via_email`: that one asks whether *this* announcement warrants an email,
   * and only the recipient can answer the other question. Both have to say yes.
   */
  wantsEmail: boolean;
};

type Row = { id: string; locale: string | null };

/**
 * Who has turned email off.
 *
 * A separate query rather than a column on the main select, and guarded, for
 * the same reason `getProfile()` does not read it either: this runs on every
 * dispatch, including on a database where migration 0016 has not been applied
 * yet, and a select naming a column that is not there fails the whole
 * resolution — which would cost people their in-app notifications over a
 * setting about email. Before that migration nobody can have opted out, so an
 * empty set is not just a safe fallback, it is the correct answer.
 */
async function optedOut(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();

  try {
    const rows = await db.execute<{ id: string }>(sql`
      select id::text
      from public.profiles
      where id in (${idList(ids)})
        and email_notifications = false
    `);

    return new Set([...rows].map((row) => row.id));
  } catch {
    return new Set();
  }
}

/**
 * `auth.users` is read through raw SQL and never declared as a Drizzle table:
 * declaring it would make `drizzle-kit` believe it manages a table Supabase
 * owns, and the first generated migration would try to alter it. Same rule
 * feature 12 follows.
 */
async function emailsFor(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  try {
    const rows = await db.execute<{ id: string; email: string | null }>(sql`
      select id::text, email
      from auth.users
      where id in (${idList(ids)})
    `);

    return new Map(
      [...rows]
        .filter((row) => Boolean(row.email))
        .map((row) => [row.id, row.email as string]),
    );
  } catch {
    // A missing address costs an email, not a notification. The in-app row is
    // the delivery that matters and it has already been decided by here.
    return new Map();
  }
}

/**
 * One placeholder per id.
 *
 * Not `= any(${ids}::uuid[])`: Drizzle binds a JS array as a single parameter,
 * so Postgres receives the whole list as one value and answers
 * `malformed array literal`. Types match either way and it only fails at
 * runtime — the same trap `idList()` in `lib/clients/queries.ts` exists for.
 */
function idList(ids: string[]) {
  return sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
}

/** The `where` fragment that defines each audience. */
function predicate(audience: NotificationAudience, userId: string | null) {
  const live = sql`
    exists (
      select 1 from public.client_assignments a
      where a.user_id = p.id and a.status in ('active', 'paused')
    )`;

  switch (audience) {
    case "one":
      return sql`p.id = ${userId}::uuid`;
    case "active_plan":
      return live;
    case "no_plan":
      return sql`not ${live}`;
    case "idle":
      // Quiet is measured from the last *finished* session, in-progress rows
      // included would count somebody who opened the runner and walked away.
      // `make_interval` rather than string concatenation so the number stays a
      // bound parameter.
      return sql`
        not exists (
          select 1 from public.workout_sessions s
          where s.user_id = p.id
            and s.status = 'completed'
            and s.started_at > now() - make_interval(days => ${IDLE_AFTER_DAYS})
        )`;
    case "all":
    default:
      return sql`true`;
  }
}

export async function resolveAudience(
  audience: NotificationAudience,
  audienceUserId: string | null,
): Promise<Recipient[]> {
  if (audience === "one" && !audienceUserId) return [];

  const rows = await db.execute<Row>(sql`
    select p.id::text, p.locale
    from public.profiles p
    where p.role = 'client'
      and ${predicate(audience, audienceUserId)}
    order by p.created_at
  `);

  const people = [...rows];
  const ids = people.map((row) => row.id);
  const [emails, silenced] = await Promise.all([emailsFor(ids), optedOut(ids)]);

  return people.map((row) => ({
    id: row.id,
    locale: row.locale && isLocale(row.locale) ? row.locale : "sr",
    email: emails.get(row.id) ?? null,
    wantsEmail: !silenced.has(row.id),
  }));
}

/** One person, for the system notifications that have no audience rule. */
export async function recipientById(userId: string): Promise<Recipient | null> {
  const rows = await db.execute<Row>(sql`
    select p.id::text, p.locale
    from public.profiles p
    where p.id = ${userId}::uuid
    limit 1
  `);

  const row = [...rows][0];
  if (!row) return null;

  const [emails, silenced] = await Promise.all([
    emailsFor([row.id]),
    optedOut([row.id]),
  ]);

  return {
    id: row.id,
    locale: row.locale && isLocale(row.locale) ? row.locale : "sr",
    email: emails.get(row.id) ?? null,
    wantsEmail: !silenced.has(row.id),
  };
}
