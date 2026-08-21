import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale, locales } from "@/lib/i18n/config";

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) return NextResponse.next();

  const locale = resolveLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     *  - /api        route handlers (Polar webhooks must not be redirected)
     *  - /_next      framework assets
     *  - static file requests (anything with an extension)
     */
    "/((?!api|_next/static|_next/image|.*\..*).*)",
  ],
};
