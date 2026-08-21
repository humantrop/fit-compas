"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { TZ_COOKIE } from "@/lib/dashboard/timezone";

/**
 * Tells the server which time zone the reader is in.
 *
 * Everything the dashboard counts is bucketed by calendar day, and the server
 * cannot know where the reader is standing. The browser can, so it writes the
 * zone into a cookie once and every render after that groups the training log
 * correctly — see `lib/dashboard/timezone.ts`.
 *
 * Renders nothing, and refreshes only when the cookie is actually wrong: the
 * first load of a new session is bucketed in the default zone, the refresh
 * fixes it, and every load afterwards is already right. Refreshing
 * unconditionally would re-render the whole route on every single visit.
 */
export function TimezoneProbe() {
  const router = useRouter();

  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;

    const current = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);

    if (current === zone) return;

    // A year: this changes when someone flies, not on a schedule. Lax rather
    // than Strict so the zone survives a click in from a confirmation mail.
    document.cookie = `${TZ_COOKIE}=${zone}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);

  return null;
}
