import { NextResponse, type NextRequest } from "next/server";

import { getProfile } from "@/lib/auth/session";
import { dispatchAll } from "@/lib/notifications/dispatch";

/**
 * The clock behind the notification schedules.
 *
 * Vercel Cron calls this (see `vercel.json`). Nothing else in the app has a
 * timer: a Next server is a request handler, and a `setInterval` in a module
 * would run once per warm instance, several times over on a busy deployment
 * and not at all on a cold one.
 *
 * **Who may call it.** Vercel sends `Authorization: Bearer $CRON_SECRET` when
 * the variable is set, and that is the check. It is also open to a signed-in
 * admin, so the "check schedule" button on the notifications screen and a
 * `curl` during setup both work without handing the secret around.
 *
 * When `CRON_SECRET` is unset the route refuses everyone but the admin. A
 * dispatcher anybody can trigger is a way to make somebody else's mail quota
 * disappear, and the safe default matters more than the convenience of a cron
 * job that works before it is configured — the response says which it was.
 *
 * The work itself is idempotent (see `lib/notifications/dispatch.ts`), so a
 * retry, an overlapping tick or an impatient double-click cost a little effort
 * and change nothing.
 */

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  const fromCron = Boolean(secret) && header === `Bearer ${secret}`;

  if (!fromCron) {
    const profile = await getProfile();
    if (profile?.role !== "admin") {
      return NextResponse.json(
        {
          ok: false,
          reason: secret ? "unauthorized" : "CRON_SECRET is not set",
        },
        { status: 401 },
      );
    }
  }

  try {
    const report = await dispatchAll();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    console.error("[notifications] dispatch route failed", error);

    // 500 on purpose: Vercel records a failed cron invocation, which is the
    // only place a broken dispatcher would otherwise be visible.
    return NextResponse.json(
      { ok: false, reason: error instanceof Error ? error.message : "failed" },
      { status: 500 },
    );
  }
}
