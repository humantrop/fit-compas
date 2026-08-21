import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Rotates the Supabase refresh token and mirrors the new cookies onto the
 * response. This has to run on every request or sessions silently expire.
 *
 * The returned response must be handed back to Next as-is, or replaced by a
 * response that copies its cookies over — see `withSessionCookies`.
 */
export async function refreshSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: User | null }> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );

        // These are the no-store headers Supabase supplies alongside auth
        // cookies. Dropping them lets a CDN cache one user's session token
        // and hand it to the next visitor.
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Nothing may run between createServerClient and getUser(). getUser()
  // revalidates the token against the auth server; getSession() only decodes
  // the cookie and is not trustworthy here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

/**
 * Builds a redirect that carries over every cookie the session refresh set.
 * Returning a bare NextResponse.redirect() here would drop the rotated token
 * and log the user out at random.
 */
export function withSessionCookies(
  redirect: NextResponse,
  source: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return redirect;
}
