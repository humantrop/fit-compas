"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import type { AuthErrorCode, AuthState } from "@/lib/auth/types";
import { getSiteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function fail(code: AuthErrorCode): AuthState {
  return { status: "error", code };
}

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("lang") ?? "");
  return isLocale(value) ? value : defaultLocale;
}

/** Maps Supabase's English error strings onto our codes. */
function classify(message: string): AuthErrorCode {
  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) return "invalid_credentials";
  if (text.includes("email not confirmed")) return "email_not_confirmed";
  if (text.includes("already registered") || text.includes("already been registered"))
    return "email_taken";
  if (text.includes("password")) return "weak_password";
  if (text.includes("rate limit") || text.includes("too many"))
    return "rate_limited";
  if (text.includes("invalid") && text.includes("email")) return "invalid_email";
  if (text.includes("expired") || text.includes("token")) return "invalid_link";
  return "unknown";
}

const credentials = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(8).max(128),
});

const signUpSchema = credentials.extend({
  fullName: z.string().trim().min(2).max(80),
});

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return fail("not_configured");

  const lang = localeOf(formData);
  const next = String(formData.get("next") ?? "");

  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return fail("invalid_credentials");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return fail(classify(error.message));

  revalidatePath("/", "layout");
  redirect(next.startsWith(`/${lang}/`) ? next : `/${lang}/dashboard`);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return fail("not_configured");

  const lang = localeOf(formData);

  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });

  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "password") return fail("weak_password");
    if (field === "email") return fail("invalid_email");
    return fail("unknown");
  }

  const siteUrl = await getSiteUrl();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Carried into the profiles row by the handle_new_user trigger.
      data: { full_name: parsed.data.fullName, locale: lang },
      emailRedirectTo: `${siteUrl}/api/auth/confirm?next=${encodeURIComponent(
        `/${lang}/dashboard`,
      )}`,
    },
  });

  if (error) return fail(classify(error.message));

  // Never redirect straight to the dashboard here: with email confirmation on,
  // there is no session yet and the user would bounce back to /login.
  return { status: "sent" };
}

export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return fail("not_configured");

  const lang = localeOf(formData);
  const email = String(formData.get("email") ?? "").trim();

  if (!z.string().email().safeParse(email).success) return fail("invalid_email");

  const siteUrl = await getSiteUrl();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/api/auth/confirm?next=${encodeURIComponent(
      `/${lang}/reset-password`,
    )}`,
  });

  // Reported as sent regardless, so this endpoint cannot be used to discover
  // which email addresses have accounts.
  if (error && classify(error.message) === "rate_limited") {
    return fail("rate_limited");
  }

  return { status: "sent" };
}

export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) return fail("not_configured");

  const lang = localeOf(formData);
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return fail("weak_password");
  if (password !== confirm) return fail("passwords_mismatch");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return fail(classify(error.message));

  revalidatePath("/", "layout");
  redirect(`/${lang}/dashboard`);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const lang = localeOf(formData);

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }

  revalidatePath("/", "layout");
  redirect(`/${lang}`);
}
