"use server";

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isUnitSystem } from "@/lib/account/units";
import {
  NAME_MAX,
  NAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  type AccountErrorCode,
  type AccountState,
} from "@/lib/account/types";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Everything somebody may change about their own account.
 *
 * Written against the Supabase client rather than Drizzle, and that is the
 * decision worth stating: Drizzle connects as `postgres` and bypasses RLS, so a
 * bug in a `where` clause here would be a bug that writes to somebody else's
 * row. Going through PostgREST means migration 0001's `profiles_update_own`
 * policy is a second lock on the same door — the action says "update where id =
 * me" and the database independently refuses anything else. This is the one
 * table in the app where the writer and the subject are always the same person,
 * so there is no reason to give up that guarantee.
 *
 * `role` is not writable from here at all, and would not be even if it were
 * listed: `prevent_role_escalation()` is a trigger, and it fires on the
 * PostgREST connection specifically.
 *
 * **Units come from the form here, and only here.** Everywhere else in the app
 * the rule is the opposite — `lib/progress/actions.ts` refuses to read the unit
 * system off a form, because a weight typed in pounds and stored as kilograms
 * is a lie that looks like a plausible number forever. That rule is about
 * *interpreting* a number. This action is about *choosing* the setting, so the
 * value has to arrive from somewhere, and the only thing a forged POST can do
 * is set the sender's own preference to one of two values they can already
 * pick from a menu.
 */

function fail(code: AccountErrorCode): AccountState {
  return { status: "error", code };
}

const SAVED: AccountState = { status: "saved" };

/**
 * Mirrors `LOCALE_COOKIE` in `proxy.ts` and in the header switcher.
 *
 * Written from three places and declared in three places — worth folding into
 * `lib/i18n/config.ts` when the parallel features have landed. Not folded now
 * because that file is edited by every session at once and a one-line addition
 * is not worth an edit race.
 */
const LOCALE_COOKIE = "fc_locale";

/** Maps Supabase's English error strings onto our codes. */
function classify(message: string): AccountErrorCode {
  const text = message.toLowerCase();

  if (text.includes("should be different") || text.includes("same as the old"))
    return "same_password";
  if (text.includes("invalid login credentials")) return "wrong_password";
  if (text.includes("rate limit") || text.includes("too many"))
    return "rate_limited";
  if (text.includes("password")) return "weak_password";

  return "unknown";
}

type Session =
  | { ok: false; code: AccountErrorCode }
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
      user: User;
    };

/**
 * The signed-in user, or the code to answer with.
 *
 * `getUser()` rather than `getSession()`, the same rule the rest of the app
 * follows: getSession only decodes the cookie, and every action in this file
 * writes to the row that cookie names.
 */
async function me(): Promise<Session> {
  if (!isSupabaseConfigured()) return { ok: false, code: "not_configured" };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, code: "unauthenticated" };

  return { ok: true, supabase, user };
}

/* ---------------------------------------------------------------- profile */

export async function saveProfileAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await me();
  if (!session.ok) return fail(session.code);

  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < NAME_MIN || fullName.length > NAME_MAX) {
    return fail("invalid_name");
  }

  const { error } = await session.supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", session.user.id);

  if (error) {
    console.error("[account] saveProfile failed", error);
    return fail("unavailable");
  }

  // The name is in the header on some screens and beside every session on the
  // trainer's, so this invalidates the whole tree rather than the current page.
  revalidatePath("/", "layout");
  return SAVED;
}

/* ------------------------------------------------------------ preferences */

/**
 * Units, language and the email opt-out, saved together.
 *
 * One form and one action because they are one decision — "how this app should
 * behave for me" — and three separate save buttons on one card is three chances
 * to change something and walk away without pressing anything.
 *
 * A language change ends in a redirect rather than a refresh: the locale is a
 * path segment, so staying on `/sr/account` after choosing English would leave
 * the reader on a screen that saved their choice and then ignored it.
 */
export async function savePreferencesAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await me();
  if (!session.ok) return fail(session.code);

  const units = formData.get("units");
  if (!isUnitSystem(units)) return fail("invalid_units");

  const locale = String(formData.get("locale") ?? "");
  if (!isLocale(locale)) return fail("invalid_locale");

  const current = String(formData.get("lang") ?? "");

  const patch: Record<string, unknown> = { units, locale };

  // The hidden companion field is what tells checked-and-absent apart from
  // unchecked-and-absent — an unticked checkbox posts nothing at all. It is
  // only rendered when the column exists, so a database still waiting for
  // migration 0016 saves the other two settings instead of failing all three.
  if (formData.get("emailPrefEnabled") === "1") {
    patch.email_notifications = formData.get("emailPref") === "on";
  }

  const { error } = await session.supabase
    .from("profiles")
    .update(patch)
    .eq("id", session.user.id);

  if (error) {
    console.error("[account] savePreferences failed", error);
    return fail("unavailable");
  }

  await rememberLocaleCookie(locale);
  revalidatePath("/", "layout");

  if (isLocale(current) && current !== locale) {
    redirect(`/${locale}/account`);
  }

  return SAVED;
}

/**
 * The header switcher's other half.
 *
 * The switcher has always written a cookie, which is enough to decide what
 * `/` redirects to and nothing else. `profiles.locale` is the one that matters:
 * it is what feature 15 freezes into every notification at delivery time, so a
 * client reading the app in English while their row still says `sr` gets their
 * reminders in Serbian and has no idea why. Switching the language in the
 * header now means the same thing as switching it on this screen.
 *
 * Silent by design — it is a side effect of a navigation, not a form
 * submission, and a signed-out visitor on the marketing site calls it too.
 */
export async function rememberLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;

  await rememberLocaleCookie(locale);

  try {
    const session = await me();
    if (!session.ok) return;

    await session.supabase
      .from("profiles")
      .update({ locale })
      .eq("id", session.user.id);
  } catch (error) {
    console.error("[account] rememberLocale failed", error);
  }
}

async function rememberLocaleCookie(locale: Locale): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

/* --------------------------------------------------------------- password */

/**
 * Change the password, current one required.
 *
 * Supabase will happily change a password from a session alone, and that is the
 * behaviour worth refusing: a phone left unlocked on a bench is a session, and
 * with it anybody could lock the owner out of their own account in two taps.
 * The current password is checked by actually signing in with it — the only
 * check that cannot be faked, since there is nothing else to compare against.
 *
 * That re-authentication issues a fresh session and rewrites the cookies, which
 * is why it runs before the update and not after: the user ends the request
 * signed in on this device, and every other device is dropped on purpose.
 * Somebody changing their password usually has a reason.
 */
export async function changePasswordAction(
  _prev: AccountState,
  formData: FormData,
): Promise<AccountState> {
  const session = await me();
  if (!session.ok) return fail(session.code);

  const email = session.user.email;
  if (!email) return fail("unavailable");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current) return fail("wrong_password");
  if (next.length < PASSWORD_MIN || next.length > PASSWORD_MAX) {
    return fail("weak_password");
  }
  if (next !== confirm) return fail("passwords_mismatch");
  if (next === current) return fail("same_password");

  const { error: signInError } = await session.supabase.auth.signInWithPassword({
    email,
    password: current,
  });

  if (signInError) {
    const code = classify(signInError.message);
    // Anything that is not a rate limit means the password was wrong. Saying
    // "unknown error" over a mistyped password would send somebody to the reset
    // flow for no reason.
    return fail(code === "rate_limited" ? "rate_limited" : "wrong_password");
  }

  const { error } = await session.supabase.auth.updateUser({ password: next });
  if (error) return fail(classify(error.message));

  // Best effort: the password is already changed, and a session that outlived
  // it is a smaller problem than telling somebody the change failed when it
  // did not.
  try {
    await session.supabase.auth.signOut({ scope: "others" });
  } catch (signOutError) {
    console.error("[account] could not drop other sessions", signOutError);
  }

  revalidatePath("/", "layout");
  return SAVED;
}
