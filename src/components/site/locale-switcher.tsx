"use client";

import { Globe } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { localeNames, localeShort, locales, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    setOpen(false);
    if (next === current) return;

    // Remember the explicit choice so proxy.ts stops guessing from headers.
    document.cookie = `fc_locale=${next};path=/;max-age=31536000;samesite=lax`;

    const segments = pathname.split("/");
    segments[1] = next; // [0] is the empty string before the leading slash
    startTransition(() => router.push(segments.join("/") || `/${next}`));
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex h-11 items-center gap-1.5 rounded-control px-3",
          "text-[13px] font-semibold text-ink-300 transition-colors",
          "hover:bg-white/6 hover:text-ink-100",
          pending && "opacity-60",
        )}
      >
        <Globe className="size-4" />
        {localeShort[current]}
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="glass-strong absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-control p-1"
          >
            {locales.map((locale) => (
              <li key={locale}>
                <button
                  type="button"
                  role="option"
                  aria-selected={locale === current}
                  onClick={() => switchTo(locale)}
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-lg px-3",
                    "text-sm transition-colors hover:bg-white/8",
                    locale === current
                      ? "font-semibold text-brand-300"
                      : "text-ink-200",
                  )}
                >
                  {localeNames[locale]}
                  <span className="text-[11px] text-ink-500">
                    {localeShort[locale]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
