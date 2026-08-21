import { Bell } from "lucide-react";
import Link from "next/link";

import { getUser } from "@/lib/auth/session";
import type { Locale } from "@/lib/i18n/config";
import { countUnread } from "@/lib/notifications/queries";

/**
 * The bell in the client app's header.
 *
 * A server component that resolves the reader itself rather than taking a
 * `userId` prop. `AppShell` renders on every screen in the client area and its
 * callers are pages owned by four different features — threading a count down
 * through all of them would mean editing each one, which is how a parallel
 * session eats somebody else's work. This costs one session lookup per render;
 * worth folding into a request-cached session helper once the parallel features
 * have landed and `lib/auth/session.ts` is safe to touch.
 *
 * `countUnread` answers 0 rather than throwing (see `queries.ts`). A header
 * that can take down every page in the app is not worth a badge.
 */
export async function NotificationBell({
  lang,
  label,
}: {
  lang: Locale;
  label: string;
}) {
  const user = await getUser();
  if (!user) return null;

  const unread = await countUnread(user.id);

  return (
    <Link
      href={`/${lang}/notifications`}
      aria-label={unread > 0 ? `${label} (${unread})` : label}
      className="relative inline-flex size-9 items-center justify-center rounded-control text-ink-300 transition-colors hover:bg-white/6 hover:text-ink-100"
    >
      <Bell className="size-4.5" />

      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_10px_rgb(46_107_255/0.9)]"
        >
          {/* Two digits is the most that fits without the badge swallowing the
              icon; past that the exact number stops being the point. */}
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
