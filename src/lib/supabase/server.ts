import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  assertSupabaseConfigured,
} from "./env";

/**
 * Request-scoped client for Server Components, Server Actions and Route
 * Handlers. Never cache this — it is bound to one request's cookie jar.
 */
export async function createSupabaseServerClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Safe to swallow: proxy.ts
          // refreshes the session on every request, so the rotated token is
          // persisted there instead.
        }
      },
    },
  });
}
