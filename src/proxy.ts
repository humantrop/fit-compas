import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextResponse, type NextRequest } from "next/server";

import { isAuthPath, isProtectedPath, stripLocale } from "@/lib/auth/routes";
import { defaultLocale, locales } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { refreshSession, withSessionCookies } from "@/lib/supabase/proxy";

const LOCALE_COOKIE = "fc_locale";

/**
 * Resolution order: explicit cookie (user clicked the switcher) beats the
 * browser's Accept-Language, which beats the default.
 */
function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale;
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const languages = new Negotiator({ headers }).languages();

  try {
    return matchLocale(languages, locales as readonly string[], defaultLocale);
  } catch {
    // Negotiator can yield tags that intl-localematcher rejects (e.g. "*").
    return defaultLocale;
  }
}

/**
 * Anything ending in an extension is a file request (public/ assets, favicon,
 * source maps). Redirecting those to /sr/whatever.svg breaks them.
 *
 * This lives in code rather than in config.matcher on purpose: Next strips the
 * backslash out of an escaped `\.` when it compiles the matcher, turning
 * `.*\..*` into `.*..*` — which matches every non-empty path and silently
 * disables the proxy for the whole app. Verified in
 * .next/server/functions-config-manifest.json.
 */
const FILE_REQUEST = /\.[a-zA-Z0-9]+$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (FILE_REQUEST.test(pathname)) return NextResponse.next();

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  // Locale first, and return early. The redirected request runs through here
  // again and gets its session refreshed then.
  if (!hasLocale) {
    const locale = resolveLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // Before the keys land, the marketing pages still have to work.
  if (!isSupabaseConfigured()) return NextResponse.next();

  const locale = pathname.split("/")[1];
  const path = stripLocale(pathname);
  const { response, user } = await refreshSession(request);

  if (!user && isProtectedPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("next", pathname);
    return withSessionCookies(NextResponse.redirect(url), response);
  }

  if (user && isAuthPath(path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return withSessionCookies(NextResponse.redirect(url), response);
  }

  return response;
}

export const config = {
  // Prefix exclusions only — no escaped characters, see FILE_REQUEST above.
  // /api is excluded here so Polar webhooks are never redirected.
  matcher: ["/((?!api|_next/static|_next/image).*)"],
};
