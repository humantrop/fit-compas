import { Check } from "lucide-react";
import Link from "next/link";

import { LocaleSwitcher } from "@/components/site/locale-switcher";
import { Logo } from "@/components/site/logo";
import { Surface } from "@/components/ui/surface";
import type { Locale } from "@/lib/i18n/config";

type AsideCopy = {
  title: string;
  body: string;
  point1: string;
  point2: string;
  point3: string;
};

/**
 * Split shell: form on the left, product reminder on the right. The aside is
 * hidden below lg so the phone gets the full width for the form — this is the
 * screen people hit on mobile most often.
 */
export function AuthShell({
  lang,
  aside,
  title,
  subtitle,
  children,
  footer,
}: {
  lang: Locale;
  aside: AsideCopy;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const points = [aside.point1, aside.point2, aside.point3];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-4 pt-safe sm:px-6">
        <Link href={`/${lang}`} aria-label="Fit Compas" className="py-4">
          <Logo />
        </Link>
        <LocaleSwitcher current={lang} />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl items-center gap-14 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-md">
            <h1 className="text-3xl font-bold sm:text-[2rem]">{title}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-400">
              {subtitle}
            </p>

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-7">{footer}</div> : null}
          </div>

          <Surface tone="strong" edge className="hidden p-9 lg:block">
            <div
              aria-hidden
              className="animate-drift pointer-events-none absolute -inset-16 -z-10 rounded-full bg-brand-500/15 blur-3xl"
            />
            <h2 className="text-2xl font-bold text-ink-50">{aside.title}</h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-300">
              {aside.body}
            </p>

            <ul className="mt-8 space-y-4">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-300">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-[14px] leading-relaxed text-ink-200">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </Surface>
        </div>
      </main>
    </div>
  );
}
