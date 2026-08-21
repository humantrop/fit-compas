"use server";

import { sql } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "@/db/client";
import { getProfile, getUser } from "@/lib/auth/session";
import { dayKeyOf, isValidDayKey, type DayKey } from "@/lib/clients/schedule";
import { getTimeZone } from "@/lib/dashboard/timezone-server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import {
  METRICS,
  inRange,
  isBodyMetric,
  parseDecimal,
  toCanonical,
  type UnitSystem,
} from "./metrics";
import {
  MAX_PHOTO_BYTES,
  PROGRESS_PHOTO_BUCKET,
  isPhotoMimeType,
  isPhotoPose,
  photoObjectPath,
} from "./photos";
import type {
  ConfirmResult,
  ProgressErrorCode,
  ProgressState,
  TicketResult,
} from "./types";

/**
 * Everything the reader may do to their own progress.
 *
 * All of it is theirs. Unlike the plan — where migration 0012 drew a line
 * between what the trainer owns and what the client owns — a measurement and a
 * photo have exactly one author, and the trainer only ever reads them. So there
 * is no ownership question in this file, only the ordinary one: is the person
 * asking the person these rows belong to.
 *
 * Server Actions are reachable by a direct POST rather than only through our
 * forms, so every rule the screen appears to enforce is re-checked here: the
 * metric is one of the enum's, the day is a day and is not in the future, and
 * the value is a measurement of a person rather than a number.
 *
 * **Units are resolved from the profile, never from the form.** The form is
 * labelled in the reader's own units and posts what they typed; which system
 * that is comes from `profiles.units` on this side. A hidden field would be one
 * more thing a direct POST could lie about, and the lie would be silent — a
 * weight in pounds stored as kilograms looks like a plausible number forever.
 *
 * Drizzle connects as `postgres` and bypasses RLS: the policies in migration
 * 0014 protect these tables from PostgREST, not from this file.
 */

function fail(code: ProgressErrorCode): ProgressState {
  return { status: "error", code };
}

const SAVED: ProgressState = { status: "saved" };

type Actor = {
  userId: string;
  units: UnitSystem;
  timeZone: string;
  today: DayKey;
};

async function actor(): Promise<Actor | null> {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile();
  const timeZone = await getTimeZone();

  return {
    userId: user.id,
    units: profile?.units ?? "metric",
    timeZone,
    today: dayKeyOf(new Date(), timeZone),
  };
}

function readDay(formData: FormData, field: string): DayKey | null {
  const value = formData.get(field);
  return isValidDayKey(value) ? value : null;
}

/* ------------------------------------------------------------ measurements */

/**
 * Record a measurement, or correct one already recorded.
 *
 * Upsert rather than insert, on the `(user_id, metric, taken_on)` key: two
 * readings of the same tape on the same morning are one measurement typed
 * twice, and a chart with two points on the same x has to pick between them
 * with a rule nobody can see. Correcting a number is the common case — the
 * uncommon one is wanting both, and nobody has ever wanted both.
 */
export async function saveMeasurementAction(
  _prev: ProgressState,
  formData: FormData,
): Promise<ProgressState> {
  const me = await actor();
  if (!me) return fail("unauthenticated");

  const metric = formData.get("metric");
  if (!isBodyMetric(metric)) return fail("invalid_metric");

  const day = readDay(formData, "day");
  if (!day) return fail("invalid_day");
  // A measurement is a record of something that happened. Tomorrow's weight is
  // not a plan, it is a typo in the date field.
  if (day > me.today) return fail("future_day");

  const typed = parseDecimal(formData.get("value"));
  if (typed === null || typed <= 0) return fail("invalid_value");

  const value = toCanonical(typed, METRICS[metric].quantity, me.units);
  if (!inRange(value, metric)) return fail("out_of_range");

  try {
    await db.execute(sql`
      insert into public.body_measurements (user_id, metric, taken_on, value)
      values (
        ${me.userId}::uuid,
        ${metric}::public.body_metric,
        ${day}::date,
        ${value}::numeric
      )
      on conflict (user_id, metric, taken_on)
      do update set value = excluded.value
    `);
  } catch (error) {
    console.error("saveMeasurement failed", error);
    return fail("unavailable");
  }

  refresh();
  return SAVED;
}

/**
 * Remove a measurement.
 *
 * Keyed by metric and day rather than by row id, because that pair is what the
 * screen shows and what the unique index guarantees is one row. A delete that
 * matches nothing is reported as `not_found` rather than shrugged off: the row
 * was on screen a moment ago, and silence would leave it there.
 */
export async function deleteMeasurementAction(
  _prev: ProgressState,
  formData: FormData,
): Promise<ProgressState> {
  const me = await actor();
  if (!me) return fail("unauthenticated");

  const metric = formData.get("metric");
  if (!isBodyMetric(metric)) return fail("invalid_metric");

  const day = readDay(formData, "day");
  if (!day) return fail("invalid_day");

  try {
    const rows = await db.execute<{ id: string }>(sql`
      delete from public.body_measurements
      where user_id = ${me.userId}::uuid
        and metric = ${metric}::public.body_metric
        and taken_on = ${day}::date
      returning id::text as id
    `);

    if ([...rows].length === 0) return fail("not_found");
  } catch (error) {
    console.error("deleteMeasurement failed", error);
    return fail("unavailable");
  }

  refresh();
  return SAVED;
}

/* ------------------------------------------------------------------ photos */

/**
 * Mint a signed URL the browser can PUT the photo straight to.
 *
 * The bytes never pass through a Server Action, the same arrangement exercise
 * videos have: it keeps a real progress bar possible and keeps a 10 MB body off
 * the function. The service-role key bypasses RLS, so the path is built from
 * the *server's* idea of who is asking — `photoObjectPath(me.userId, …)` — and
 * never from anything the caller sent. That prefix is the entire storage
 * policy; a path taken from the request would be a hole in a rule that looks
 * enforced.
 */
export async function createPhotoTicketAction(input: {
  mimeType: string;
  sizeBytes: number;
}): Promise<TicketResult> {
  const me = await actor();
  if (!me) return { ok: false, code: "unauthenticated" };

  if (!isPhotoMimeType(input.mimeType)) return { ok: false, code: "wrong_type" };
  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes > MAX_PHOTO_BYTES) {
    return { ok: false, code: "file_too_large" };
  }

  const photoId = crypto.randomUUID();
  const path = photoObjectPath(me.userId, photoId, input.mimeType);

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(PROGRESS_PHOTO_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });

    if (error || !data) throw error ?? new Error("no upload URL");

    return { ok: true, ticket: { photoId, uploadUrl: data.signedUrl, path: data.path } };
  } catch (error) {
    console.error("createPhotoTicket failed", error);
    return { ok: false, code: "upload_failed" };
  }
}

/**
 * Record the photo now that the bytes are in the bucket.
 *
 * The row is written after the object, never before: a ticket that is never
 * used costs one unreferenced object, where a row written first would leave the
 * gallery pointing at a photo that does not exist.
 *
 * Replacing a slot — same day, same pose — updates the row and then deletes the
 * object it used to name. In that order, and best effort: an orphaned object
 * costs storage, while deleting first and failing to update would cost the
 * photo.
 */
export async function confirmPhotoAction(input: {
  photoId: string;
  takenOn: string;
  pose: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
}): Promise<ConfirmResult> {
  const me = await actor();
  if (!me) return { ok: false, code: "unauthenticated" };

  if (!isPhotoPose(input.pose)) return { ok: false, code: "invalid_pose" };
  if (!isPhotoMimeType(input.mimeType)) return { ok: false, code: "wrong_type" };
  if (!isValidDayKey(input.takenOn)) return { ok: false, code: "invalid_day" };
  if (input.takenOn > me.today) return { ok: false, code: "future_day" };

  // Rebuilt here rather than taken from the caller, for the same reason it was
  // built server-side in the first place.
  const path = photoObjectPath(me.userId, input.photoId, input.mimeType);

  try {
    // What is in the slot now, before it is overwritten. Read separately rather
    // than through RETURNING: `on conflict do update` returns the new row, and
    // the path being replaced is exactly what it no longer holds.
    const prior = await db.execute<{ storage_path: string }>(sql`
      select storage_path
      from public.progress_photos
      where user_id = ${me.userId}::uuid
        and taken_on = ${input.takenOn}::date
        and pose = ${input.pose}::public.photo_pose
      limit 1
    `);

    await db.execute(sql`
      insert into public.progress_photos
        (id, user_id, taken_on, pose, storage_path, width, height, size_bytes, mime_type)
      values (
        ${input.photoId}::uuid,
        ${me.userId}::uuid,
        ${input.takenOn}::date,
        ${input.pose}::public.photo_pose,
        ${path},
        ${input.width},
        ${input.height},
        ${Math.round(input.sizeBytes)},
        ${input.mimeType}
      )
      on conflict (user_id, taken_on, pose)
      do update set
        storage_path = excluded.storage_path,
        width        = excluded.width,
        height       = excluded.height,
        size_bytes   = excluded.size_bytes,
        mime_type    = excluded.mime_type
    `);

    const replaced = [...prior][0]?.storage_path;
    if (replaced && replaced !== path) await removeObjects([replaced]);
  } catch (error) {
    console.error("confirmPhoto failed", error);
    return { ok: false, code: "unavailable" };
  }

  refresh();
  return { ok: true };
}

/**
 * Delete a photo.
 *
 * The row goes first and hands back the object key on its way out, so the
 * bucket is tidied against what the database actually held rather than against
 * what the form claimed. A failure to remove the object leaves a file nobody
 * can reach — which is a storage bill, not a privacy problem, because the
 * bucket is private and nothing points at it any more.
 */
export async function deletePhotoAction(
  _prev: ProgressState,
  formData: FormData,
): Promise<ProgressState> {
  const me = await actor();
  if (!me) return fail("unauthenticated");

  const photoId = formData.get("photoId");
  if (typeof photoId !== "string" || !UUID.test(photoId)) return fail("not_found");

  try {
    const rows = await db.execute<{ storage_path: string }>(sql`
      delete from public.progress_photos
      where id = ${photoId}::uuid and user_id = ${me.userId}::uuid
      returning storage_path
    `);

    const path = [...rows][0]?.storage_path;
    if (!path) return fail("not_found");

    await removeObjects([path]);
  } catch (error) {
    console.error("deletePhoto failed", error);
    return fail("unavailable");
  }

  refresh();
  return SAVED;
}

/* ------------------------------------------------------------------ shared */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Best effort. A leftover object costs storage, not correctness. */
async function removeObjects(paths: string[]): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.storage.from(PROGRESS_PHOTO_BUCKET).remove(paths);
  } catch (error) {
    console.error("[progress] could not remove storage object", error);
  }
}
