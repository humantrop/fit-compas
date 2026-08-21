import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { Locale } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type Role = "admin" | "client";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  locale: Locale | null;
  units: "metric" | "imperial";
  onboarded_at: string | null;
};

/**
 * The authenticated user, or null. Always uses getUser() rather than
 * getSession(): getSession only decodes the cookie, which the client can forge.
 */
export async function getUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getProfile(): Promise<Profile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, avatar_url, locale, units, onboarded_at")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** The real gate for protected pages. The proxy redirect is only a shortcut. */
export async function requireUser(lang: Locale): Promise<User> {
  const user = await getUser();
  if (!user) redirect(`/${lang}/login`);
  return user;
}

export async function requireProfile(lang: Locale): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/${lang}/login`);
  return profile;
}

export async function requireAdmin(lang: Locale): Promise<Profile> {
  const profile = await requireProfile(lang);
  if (profile.role !== "admin") redirect(`/${lang}/dashboard`);
  return profile;
}
