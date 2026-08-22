import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The one thing about an account that is not already loaded for every request.
 *
 * Name, language, units and role come out of `getProfile()`, which every
 * protected page calls anyway; the address and the join date are on the Supabase
 * user object. So this module holds exactly one query — the email preference —
 * and it is here rather than in `getProfile()`'s select for a specific reason.
 *
 * **`getProfile()` must not select a column that might not exist.** It is on
 * the path of every signed-in request, and a select that errors returns no
 * profile at all, which the app reads as "not signed in" and answers with a
 * redirect to the login screen. Adding `email_notifications` there would mean
 * that between deploying feature 16 and running migration 0016 in Studio, the
 * whole app would bounce everybody to /login. Read separately, a missing column
 * costs one toggle on one screen.
 */
export async function loadEmailPreference(
  userId: string,
): Promise<boolean | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("email_notifications")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    return Boolean((data as { email_notifications: boolean }).email_notifications);
  } catch (error) {
    console.error("[account] email preference unavailable:", error);
    return null;
  }
}
