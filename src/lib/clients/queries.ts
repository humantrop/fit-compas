import "server-only";

import { cookies } from "next/headers";
import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import type { Translated } from "@/db/schema/i18n";
import type { AssignmentStatus } from "@/db/schema/clients";

import {
  dayKeyOf,
  planEnd as planEndOf,
  planProgress,
  planRange,
  shiftDay,
  type DayKey,
  type GridWeek,
  type ProgramGrid,
} from "./schedule";
import type {
  AssignmentView,
  ClientDetail,
  ClientSummary,
  NoteView,
  ProgramOption,
  ScheduleEntry,
  SessionView,
} from "./types";

/**
 * Everything the admin's client screens read.
 *
 * Three things about the shape of this file are deliberate.
 *
 * **The reads are split rather than joined into one statement.** Emails live in
 * `auth.users`, which Supabase owns; the activity numbers live in
 * `workout_sessions`, which feature 10 created outside the Drizzle schema. A
 * single query over all three fails entirely if any one of them is missing or
 * unreadable, and the useful failure mode here is a client list without the
 * email column, not a 500 on the People screen.
 *
 * **`auth.users` is read through raw SQL and never declared as a Drizzle
 * table.** Declaring it would make `drizzle-kit` believe it manages a table
 * Supabase owns, and the first generated migration would try to alter it.
 *
 * **The schedule is computed, not stored.** See `./schedule.ts`.
 */

/* --------------------------------------------------------------- timezone */

/**
 * Which zone the day buckets are counted in.
 *
 * Same cookie the client dashboard writes (`lib/dashboard/timezone.ts`) — the
 * name is repeated rather than imported while feature 11 and this one are
 * being built in parallel sessions, on the convention that a feature owns its
 * own helpers until the parallel work settles.
 *
 * The honest caveat: this is the *admin's* zone, not the client's, and the
 * server has no way to know where the client is standing. For a single trainer
 * whose clients are mostly in the same country that is off by at most a couple
 * of late-evening sessions, and being wrong the other way — bucketing in UTC —
 * is wrong for everybody at once.
 */
const TZ_COOKIE = "fc-tz";
const DEFAULT_TIME_ZONE = "Europe/Belgrade";

function isTimeZone(value: string | undefined): value is string {
  if (!value || value.length > 64 || !/^[A-Za-z][A-Za-z0-9+\-_/]*$/.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function getAdminTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return isTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

/* ------------------------------------------------------------------- list */

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  created_at: Date;
  assignment_id: string | null;
  assignment_status: AssignmentStatus | null;
  start_date: string | null;
  program_id: string | null;
  program_title: Translated | null;
  note_count: number;
};

type EmailRow = {
  id: string;
  email: string | null;
  last_sign_in_at: Date | null;
  email_confirmed_at: Date | null;
};

type ActivityRow = {
  user_id: string;
  sessions: number;
  recent_sessions: number;
  last_session_at: Date | null;
};

/**
 * `client_notes` is counted in the same statement as the profile because both
 * tables arrive in migration 0012 — if one is missing so is the other, and the
 * screen is broken either way.
 */
async function loadProfiles(): Promise<ProfileRow[]> {
  const rows = await db.execute<ProfileRow>(sql`
    select
      p.id::text                as id,
      p.full_name               as full_name,
      p.avatar_url              as avatar_url,
      p.locale                  as locale,
      p.created_at              as created_at,
      a.id::text                as assignment_id,
      a.status::text            as assignment_status,
      a.start_date::text        as start_date,
      pr.id::text               as program_id,
      pr.title                  as program_title,
      coalesce(n.note_count, 0) as note_count
    from public.profiles p
    left join lateral (
      select ca.id, ca.status, ca.start_date, ca.program_id
      from public.client_assignments ca
      where ca.user_id = p.id and ca.status in ('active', 'paused')
      order by ca.created_at desc
      limit 1
    ) a on true
    left join public.programs pr on pr.id = a.program_id
    left join lateral (
      select count(*)::int as note_count
      from public.client_notes cn
      where cn.user_id = p.id
    ) n on true
    where p.role = 'client'
    order by coalesce(nullif(p.full_name, ''), 'zzz') asc, p.created_at asc
  `);

  return [...rows];
}

/**
 * A parameterised `in (...)` list.
 *
 * Not `= any(${ids}::uuid[])`: Drizzle binds a JS array as one parameter and
 * Postgres reads it as a malformed array literal. Joining one placeholder per
 * id keeps every value bound rather than interpolated.
 */
function idList(ids: string[]) {
  return sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
}

/** Supabase owns `auth.users`. Read-only, and never through Drizzle's schema. */
async function loadEmails(ids: string[]): Promise<Map<string, EmailRow>> {
  if (!ids.length) return new Map();

  try {
    const rows = await db.execute<EmailRow>(sql`
      select
        id::text as id,
        email,
        last_sign_in_at,
        email_confirmed_at
      from auth.users
      where id in (${idList(ids)})
    `);

    return new Map([...rows].map((row) => [row.id, row]));
  } catch (error) {
    // A pooler role without access to the auth schema costs the email column,
    // not the screen.
    console.error("listClients: could not read auth.users", error);
    return new Map();
  }
}

async function loadActivity(ids: string[]): Promise<Map<string, ActivityRow>> {
  if (!ids.length) return new Map();

  try {
    const rows = await db.execute<ActivityRow>(sql`
      select
        user_id::text                                        as user_id,
        count(*)::int                                        as sessions,
        count(*) filter (
          where started_at >= now() - interval '30 days'
        )::int                                               as recent_sessions,
        max(started_at)                                      as last_session_at
      from public.workout_sessions
      where user_id in (${idList(ids)}) and status = 'completed'
      group by user_id
    `);

    return new Map([...rows].map((row) => [row.user_id, row]));
  } catch (error) {
    console.error("listClients: could not read workout_sessions", error);
    return new Map();
  }
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export async function listClients(): Promise<ClientSummary[]> {
  const profiles = await loadProfiles();
  const ids = profiles.map((row) => row.id);

  const [emails, activity] = await Promise.all([
    loadEmails(ids),
    loadActivity(ids),
  ]);

  return profiles.map((row) => {
    const user = emails.get(row.id);
    const stats = activity.get(row.id);

    return {
      id: row.id,
      fullName: row.full_name,
      email: user?.email ?? null,
      avatarUrl: row.avatar_url,
      locale: row.locale,
      joinedAt: iso(row.created_at) ?? "",
      lastSignInAt: iso(user?.last_sign_in_at ?? null),
      emailConfirmed: Boolean(user?.email_confirmed_at),
      plan:
        row.assignment_id && row.program_id && row.start_date
          ? {
              assignmentId: row.assignment_id,
              programId: row.program_id,
              programTitle: row.program_title ?? {},
              status: (row.assignment_status ?? "active") as AssignmentStatus,
              startDate: row.start_date,
            }
          : null,
      sessions: Number(stats?.sessions ?? 0),
      recentSessions: Number(stats?.recent_sessions ?? 0),
      lastSessionAt: iso(stats?.last_session_at ?? null),
      noteCount: Number(row.note_count ?? 0),
    };
  });
}

/* ----------------------------------------------------------------- detail */

type AssignmentRow = {
  id: string;
  program_id: string;
  program_slug: string;
  program_title: Translated | null;
  status: AssignmentStatus;
  start_date: string;
  paused_on: string | null;
  ended_on: string | null;
  note: string | null;
  created_at: Date;
};

function toAssignment(row: AssignmentRow): AssignmentView {
  return {
    id: row.id,
    programId: row.program_id,
    programSlug: row.program_slug,
    programTitle: row.program_title ?? {},
    status: row.status,
    startDate: row.start_date,
    pausedOn: row.paused_on,
    endedOn: row.ended_on,
    note: row.note,
    createdAt: iso(row.created_at) ?? "",
  };
}

async function loadAssignments(userId: string): Promise<AssignmentView[]> {
  const rows = await db.execute<AssignmentRow>(sql`
    select
      a.id::text         as id,
      a.program_id::text as program_id,
      pr.slug            as program_slug,
      pr.title           as program_title,
      a.status::text     as status,
      a.start_date::text as start_date,
      a.paused_on::text  as paused_on,
      a.ended_on::text   as ended_on,
      a.note             as note,
      a.created_at       as created_at
    from public.client_assignments a
    join public.programs pr on pr.id = a.program_id
    where a.user_id = ${userId}::uuid
    order by a.created_at desc
  `);

  return [...rows].map(toAssignment);
}

async function loadNotes(userId: string): Promise<NoteView[]> {
  const rows = await db.execute<{
    id: string;
    body: string;
    pinned: boolean;
    created_at: Date;
    updated_at: Date;
  }>(sql`
    select id::text as id, body, pinned, created_at, updated_at
    from public.client_notes
    where user_id = ${userId}::uuid
    order by pinned desc, created_at desc
  `);

  return [...rows].map((row) => ({
    id: row.id,
    body: row.body,
    pinned: row.pinned,
    createdAt: iso(row.created_at) ?? "",
    updatedAt: iso(row.updated_at) ?? "",
  }));
}

/** How many days of log the profile screen pulls back. */
const SESSION_LIMIT = 12;

type SessionRow = {
  id: string;
  workout_ref: string;
  workout_title: string;
  status: string;
  started_at: Date;
  elapsed_sec: number;
  completed_sets: number;
  total_sets: number;
  total_volume: string;
  rpe: number | null;
  notes: string | null;
};

async function loadSessions(userId: string): Promise<SessionView[]> {
  const rows = await db.execute<SessionRow>(sql`
    select
      id::text as id, workout_ref, workout_title, status::text as status,
      started_at, elapsed_sec, completed_sets, total_sets,
      total_volume::text as total_volume, rpe, notes
    from public.workout_sessions
    where user_id = ${userId}::uuid
    order by started_at desc
    limit ${SESSION_LIMIT}
  `);

  return [...rows].map((row) => ({
    id: row.id,
    workoutRef: row.workout_ref,
    workoutTitle: row.workout_title,
    status: row.status,
    startedAt: iso(row.started_at) ?? "",
    elapsedSec: Number(row.elapsed_sec),
    completedSets: Number(row.completed_sets),
    totalSets: Number(row.total_sets),
    volume: Number(row.total_volume ?? 0),
    rpe: row.rpe === null ? null : Number(row.rpe),
    notes: row.notes,
  }));
}

/**
 * Which calendar days the client actually trained on, bucketed in SQL.
 *
 * Grouping in UTC and relabelling afterwards puts a 01:30 session on the wrong
 * day, and the whole point of this map is lining sessions up against the plan.
 * `timeZone` is a bound parameter, never interpolated, and shape-checked above.
 */
async function loadTrainedDays(
  userId: string,
  timeZone: string,
  from: DayKey,
  to: DayKey,
): Promise<Map<DayKey, { count: number; refs: Set<string> }>> {
  const rows = await db.execute<{ day: string; count: number; refs: string[] }>(sql`
    select
      to_char((started_at at time zone ${timeZone})::date, 'YYYY-MM-DD') as day,
      count(*)::int                                                      as count,
      array_agg(distinct workout_ref)                                    as refs
    from public.workout_sessions
    where user_id = ${userId}::uuid
      and status = 'completed'
      and (started_at at time zone ${timeZone})::date
          between ${from}::date and ${to}::date
    group by 1
  `);

  return new Map(
    [...rows].map((row) => [
      row.day,
      { count: Number(row.count), refs: new Set(row.refs ?? []) },
    ]),
  );
}

async function loadTotals(userId: string) {
  const rows = await db.execute<{
    sessions: number;
    sets: number;
    volume: string;
    seconds: number;
  }>(sql`
    select
      count(*)::int                         as sessions,
      coalesce(sum(completed_sets), 0)::int as sets,
      coalesce(sum(total_volume), 0)::text  as volume,
      coalesce(sum(elapsed_sec), 0)::int    as seconds
    from public.workout_sessions
    where user_id = ${userId}::uuid and status = 'completed'
  `);

  const row = [...rows][0];

  return {
    sessions: Number(row?.sessions ?? 0),
    sets: Number(row?.sets ?? 0),
    volume: Number(row?.volume ?? 0),
    seconds: Number(row?.seconds ?? 0),
  };
}

/**
 * A program's grid with the workouts resolved.
 *
 * One query, left-joined all the way down: a week with no slots and a slot
 * with no workout both have to survive into the grid, because both are states
 * the program editor can legitimately be left in.
 */
export async function loadProgramGrid(
  programId: string,
): Promise<ProgramGrid | null> {
  const rows = await db.execute<{
    program_id: string;
    program_title: Translated | null;
    days_per_week: number;
    week_id: string | null;
    week_position: number | null;
    week_label: Translated | null;
    day_position: number | null;
    is_rest: boolean | null;
    workout_id: string | null;
    workout_slug: string | null;
    workout_title: Translated | null;
    day_note: Translated | null;
  }>(sql`
    select
      pr.id::text        as program_id,
      pr.title           as program_title,
      pr.days_per_week   as days_per_week,
      w.id::text         as week_id,
      w.position         as week_position,
      w.label            as week_label,
      d.position         as day_position,
      d.is_rest          as is_rest,
      d.workout_id::text as workout_id,
      wo.slug            as workout_slug,
      wo.title           as workout_title,
      d.note             as day_note
    from public.programs pr
    left join public.program_weeks w on w.program_id = pr.id
    left join public.program_days d on d.week_id = w.id
    left join public.workouts wo on wo.id = d.workout_id
    where pr.id = ${programId}::uuid
    order by w.position asc, d.position asc
  `);

  const list = [...rows];
  const first = list[0];
  if (!first) return null;

  const weeks: GridWeek[] = [];
  const byId = new Map<string, GridWeek>();

  for (const row of list) {
    if (!row.week_id) continue;

    let week = byId.get(row.week_id);
    if (!week) {
      week = {
        id: row.week_id,
        position: row.week_position ?? 0,
        label: row.week_label,
        days: [],
      };
      byId.set(row.week_id, week);
      weeks.push(week);
    }

    if (row.day_position === null) continue;

    week.days.push({
      position: row.day_position,
      isRest: row.is_rest ?? false,
      workoutId: row.workout_id,
      workoutSlug: row.workout_slug,
      workoutTitle: row.workout_title,
      note: row.day_note,
    });
  }

  return {
    programId: first.program_id,
    title: first.program_title ?? {},
    daysPerWeek: first.days_per_week ?? 7,
    weeks,
  };
}

/** How far back and forward the schedule strip reaches from today. */
const SCHEDULE_BACK = 3;
const SCHEDULE_FORWARD = 13;

export async function getClient(id: string): Promise<ClientDetail | null> {
  const profileRows = await db.execute<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    locale: string | null;
    units: string;
    role: string;
    created_at: Date;
  }>(sql`
    select
      id::text as id, full_name, avatar_url, locale,
      units::text as units, role::text as role, created_at
    from public.profiles
    where id = ${id}::uuid
  `);

  const profile = [...profileRows][0];
  if (!profile) return null;

  const timeZone = await getAdminTimeZone();
  const today = dayKeyOf(new Date(), timeZone);

  const [emails, assignments, notes] = await Promise.all([
    loadEmails([profile.id]),
    loadAssignments(profile.id),
    loadNotes(profile.id),
  ]);

  // Everything below touches the runner's log, which is a separate migration.
  // A database without it gives a profile that says so, not a 500.
  let sessions: SessionView[] = [];
  let totals = { sessions: 0, sets: 0, volume: 0, seconds: 0 };
  let trained = new Map<DayKey, { count: number; refs: Set<string> }>();
  let logAvailable = true;

  const from = shiftDay(today, -SCHEDULE_BACK);
  const to = shiftDay(today, SCHEDULE_FORWARD);

  try {
    [sessions, totals, trained] = await Promise.all([
      loadSessions(profile.id),
      loadTotals(profile.id),
      loadTrainedDays(profile.id, timeZone, from, to),
    ]);
  } catch (error) {
    console.error("getClient: could not read workout_sessions", error);
    logAvailable = false;
  }

  const live = assignments.find(
    (row) => row.status === "active" || row.status === "paused",
  );

  let schedule: ScheduleEntry[] = [];
  let planEnd: DayKey | null = null;
  let progress: ClientDetail["progress"] = null;

  if (live) {
    const grid = await loadProgramGrid(live.programId);

    if (grid) {
      planEnd = planEndOf(grid, live.startDate);
      progress = planProgress(grid, live.startDate, today);

      schedule = planRange(grid, live.startDate, from, to).map((plan) => {
        const day = trained.get(plan.day);
        const slug = plan.workoutSlug;

        return {
          plan,
          isToday: plan.day === today,
          isPast: plan.day < today,
          done: day?.count ?? 0,
          // The runner logs a workout by slug (`workout_ref`), so a session on
          // the right day still has to be the right workout to count as the
          // plan being followed. Any other session that day shows as trained
          // but unmatched — which is a different, and true, thing to say.
          matched: Boolean(slug && day?.refs.has(slug)),
        };
      });
    }
  }

  const user = emails.get(profile.id);

  return {
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      email: user?.email ?? null,
      avatarUrl: profile.avatar_url,
      locale: profile.locale,
      units: profile.units,
      role: profile.role,
      joinedAt: iso(profile.created_at) ?? "",
      lastSignInAt: iso(user?.last_sign_in_at ?? null),
      emailConfirmed: Boolean(user?.email_confirmed_at),
    },
    assignment: live ?? null,
    history: assignments.filter((row) => row.id !== live?.id),
    notes,
    sessions,
    totals,
    schedule,
    planEnd,
    progress,
    today,
    timeZone,
    logAvailable,
  };
}

/**
 * What the assign form offers.
 *
 * Drafts are included, and marked. The trainer writing a program for one
 * client and starting them on it before it is published is the normal case for
 * a single-coach product — hiding drafts here would only force a publish that
 * exposes the program to the whole library.
 */
export async function listProgramOptions(): Promise<ProgramOption[]> {
  const rows = await db.execute<{
    id: string;
    title: Translated | null;
    is_published: boolean;
    week_count: number;
    days_per_week: number;
  }>(sql`
    select
      pr.id::text      as id,
      pr.title         as title,
      pr.is_published  as is_published,
      pr.days_per_week as days_per_week,
      (
        select count(*)::int from public.program_weeks w
        where w.program_id = pr.id
      ) as week_count
    from public.programs pr
    order by pr.is_published desc, pr.created_at desc
  `);

  return [...rows].map((row) => ({
    id: row.id,
    title: row.title ?? {},
    isPublished: row.is_published,
    weekCount: Number(row.week_count),
    daysPerWeek: Number(row.days_per_week),
  }));
}
