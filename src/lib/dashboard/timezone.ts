/**
 * Which time zone the numbers on the dashboard are counted in.
 *
 * The dashboard renders on the server, and the server has no idea where the
 * reader is. Everything on this screen is bucketed by calendar day — the week
 * strip, the streak, "this week" — so getting the zone wrong moves late-evening
 * workouts to the wrong day and quietly breaks the streak.
 *
 * The browser knows, so it writes it down once (see `components/app/timezone-probe.tsx`)
 * and every later render reads it here. The first render of a brand new session
 * uses the default; the probe refreshes the route if the real zone differs, so
 * the wrong-by-one-day state lasts one paint at most.
 *
 * Feature 14 buckets progress charts the same way and should read this too.
 *
 * No `next/headers` in here: the probe is a client component and imports the
 * cookie name from this file, so reading the cookie lives one file over in
 * `timezone-server.ts`. A single module would pull `next/headers` into the
 * browser bundle and fail the build.
 */

export const TZ_COOKIE = "fc-tz";

/** Where the trainer and most of the first clients are. */
export const DEFAULT_TIME_ZONE = "Europe/Belgrade";

/**
 * A cookie is attacker-controlled and this value ends up inside an
 * `at time zone` in SQL. It is passed as a bound parameter rather than
 * interpolated, so it cannot be injected — but a junk value would still make
 * the whole query throw, and the shape check plus `Intl` is cheaper than
 * losing the screen to a typo.
 */
export function isTimeZone(value: string | undefined): value is string {
  if (!value || value.length > 64 || !/^[A-Za-z][A-Za-z0-9+\-_/]*$/.test(value)) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
