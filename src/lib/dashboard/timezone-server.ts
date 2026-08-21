import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_TIME_ZONE, isTimeZone, TZ_COOKIE } from "./timezone";

/**
 * The reader's time zone as the browser reported it, or the default.
 *
 * Split out of `timezone.ts` because that module is also imported by the
 * client-side probe that writes the cookie, and `next/headers` in a module
 * that reaches the browser bundle is a build error.
 */
export async function getTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return isTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}
