import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "./env";

/**
 * Service-role client. Bypasses RLS entirely, so it must never be reachable
 * from a route that has not already authorised the caller itself.
 *
 * Used for: minting signed upload/playback URLs, reconciling Polar webhooks
 * against `subscriptions`, and admin-only writes.
 */
export function createSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
