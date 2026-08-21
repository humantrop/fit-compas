"use client";

import { Check } from "lucide-react";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Surface } from "@/components/ui/surface";
import { formatPrice, plans } from "@/lib/pricing";
import { localeTags, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type PlanCopy = { name: string; tagline: string; features: string[] };

type PricingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  monthly: string;
  yearly: string;
  yearlyBadge: string;
  perMonth: string;
  popular: string;
  cta: string;
  plans: PlanCopy[];
};

export function Pricing({ lang, copy }: { lang: Locale; copy: PricingCopy }) {
  const [yearly, setYearly] = useState(false);
  const tag = localeTags[lang];

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6">
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <h2 className="mt-5 max-w-2xl text-3xl font-bold sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-400">
          {copy.subtitle}
        </p>

        <div
          role="group"
          className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/4 p-1"
        >
          {[
            { value: false, label: copy.monthly },
            { value: true, label: copy.yearly },
          ].map((option) => (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={yearly === option.value}
              onClick={() => setYearly(option.value)}
              className={cn(
                "h-10 rounded-full px-5 text-[13px] font-semibold transition-all",
                yearly === option.value
                  ? "bg-linear-to-b from-brand-400 to-brand-600 text-white glow-brand"
                  : "text-ink-300 hover:text-ink-100",
              )}
            >
              {option.label}
            </button>
          ))}
          <span className="ml-1.5 mr-2 hidden rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-semibold text-success sm:block">
            {copy.yearlyBadge}
          </span>
        </div>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {plans.map((plan, index) => {
          const planCopy = copy.plans[index];
          const perMonth = yearly ? Math.round(plan.yearly / 12) : plan.monthly;

          return (
            <Surface
              key={plan.id}
              tone={plan.popular ? "strong" : "default"}
              edge={plan.popular}
              className={cn(
                "flex flex-col p-7",
                plan.popular && "ring-1 ring-brand-500/30",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-ink-50">
                    {planCopy.name}
                  </h3>
                  <p className="mt-1 text-[13px] text-ink-400">
                    {planCopy.tagline}
                  </p>
                </div>
                {plan.popular ? (
                  <span className="shrink-0 rounded-full border border-brand-500/30 bg-brand-500/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
                    {copy.popular}
                  </span>
                ) : null}
              </div>

              <div className="mt-7 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tracking-tight text-ink-50 tabular-nums">
                  {formatPrice(perMonth, plan.currency, tag)}
                </span>
                <span className="text-sm text-ink-400">{copy.perMonth}</span>
              </div>

              <ul className="mt-7 flex-1 space-y-3">
                {planCopy.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-300">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-[14px] leading-relaxed text-ink-200">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={`/${lang}/signup?plan=${plan.id}&cycle=${yearly ? "yearly" : "monthly"}`}
                size="lg"
                variant={plan.popular ? "primary" : "secondary"}
                className="mt-8 w-full"
              >
                {copy.cta}
              </ButtonLink>
            </Surface>
          );
        })}
      </div>
    </section>
  );
}
