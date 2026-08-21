import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { defaultLocale } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase email link: signup confirmation, password
 * recovery, email change.
 *
 * Two shapes are accepted on purpose:
 *
 *  - `token_hash` + `type` — produced when the email template is switched to
 *    `{{ .TokenHash }}`. Works on any device, because it does not depend on a
 *    PKCE verifier cookie from the browser that started the flow.
 *  - `code` — the default template with a PKCE client. Only works if the link
 *    is opened in the same browser that signed up.
 *
 * Supporting both means the app works before the templates are customised and
 * keeps working after.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? `/${defaultLocale}/dashboard`;

  // Only ever redirect to a path on this origin — an attacker-supplied `next`
  // would otherwise turn this into an open redirect.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const errorUrl = new URL(`/${defaultLocale}/login?error=invalid_link`, origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL(`/${defaultLocale}/login`, origin));
  }

  const supabase = await createSupabaseServerClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return NextResponse.redirect(errorUrl);
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(errorUrl);
    return NextResponse.redirect(new URL(safeNext, origin));
  }

  return NextResponse.redirect(errorUrl);
}
