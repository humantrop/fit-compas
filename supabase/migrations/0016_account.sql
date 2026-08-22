-- =============================================================================
-- Fit Compas — 0016: account and settings (feature 16)
--
-- Run once in Supabase Studio -> SQL Editor -> New query -> Run.
-- Idempotent: running it twice is safe.
--
-- One column, and everything else feature 16 needs is already here.
--
-- The settings screen writes `full_name`, `locale` and `units`, and all three
-- have been columns on `profiles` since migration 0001 — the switch was the
-- only thing missing, not the storage. Units in particular: the database has
-- always stored kilograms and centimetres, and `profiles.units` has always
-- decided what the screen draws. Flipping it moves no data.
--
-- What did not exist is the client's own say over email. Feature 15 made that
-- a per-message decision at the trainer's end (`notification_messages.
-- via_email`), which is the right question for "does this announcement warrant
-- an email" and the wrong one for "do I want email from this app at all". Only
-- the recipient can answer the second, so it belongs on their row.
--
-- Default true, and that is deliberate. The trainer's clients signed up for
-- coaching; the reminder that lands in their inbox is the product working. An
-- opt-out that starts off means the feature is invisible until somebody goes
-- looking for it, which is how a reminder system gets built and never used.
--
-- **No new RLS.** `profiles` already carries it from 0001: a client may read
-- and update their own row and nobody else's, and `prevent_role_escalation()`
-- keeps `role` out of reach even inside their own. A new column on that table
-- inherits the whole arrangement — which is exactly why the preference lives
-- here rather than in a settings table that would need its own policies to say
-- the same thing again.
-- =============================================================================

-- ---------- the opt-out -----------------------------------------------------

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

comment on column public.profiles.email_notifications is
  'Client-side opt-out for notification email. The trainer decides per message
   whether it goes to the inbox as well; this decides whether this person is a
   valid destination for one. In-app notifications are unaffected — turning
   email off must never cost somebody a notification, only a copy of it.';

-- ---------- checks ----------------------------------------------------------
-- The column is readable and writable through PostgREST under the policies
-- 0001 already declared. Worth confirming after running this, with a signed-in
-- session rather than the anon key:
--
--   select id, units, locale, email_notifications from public.profiles;
--
-- returns exactly one row — your own. The anon key returns [].
