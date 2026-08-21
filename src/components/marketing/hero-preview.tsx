import { Check, Play } from "lucide-react";

import { Surface } from "@/components/ui/surface";

type PreviewCopy = {
  cardLabel: string;
  cardTitle: string;
  cardMeta: string;
  cardProgress: string;
  cardCta: string;
  exercise1: string;
  exercise2: string;
  exercise3: string;
};

/**
 * A miniature of the real workout screen. It is static markup on purpose —
 * a screenshot would go stale and cost a network round trip above the fold.
 */
export function HeroPreview({ copy }: { copy: PreviewCopy }) {
  const rows = [
    { name: copy.exercise1, detail: "4 × 8", done: true },
    { name: copy.exercise2, detail: "4 × 10", done: true },
    { name: copy.exercise3, detail: "3 × 12", done: false },
  ];

  return (
    <div className="relative">
      {/* Blue bloom behind the card, the same halo primary buttons cast. */}
      <div
        aria-hidden
        className="animate-drift absolute -inset-10 -z-10 rounded-full bg-brand-500/20 blur-3xl"
      />

      <Surface tone="strong" edge className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-300">
              {copy.cardLabel}
            </p>
            <h3 className="mt-1.5 text-lg font-bold text-ink-50">
              {copy.cardTitle}
            </h3>
            <p className="mt-1 text-[13px] text-ink-400">{copy.cardMeta}</p>
          </div>

          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-linear-to-b from-brand-400 to-brand-600 glow-brand">
            <Play className="size-5 fill-white text-white" />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-medium text-ink-400">
            <span>{copy.cardProgress}</span>
            <span className="font-mono text-brand-300">44%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-[44%] rounded-full bg-linear-to-r from-brand-500 to-glow" />
          </div>
        </div>

        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-3 py-2.5"
            >
              <span
                className={
                  row.done
                    ? "grid size-7 shrink-0 place-items-center rounded-lg bg-success/15 text-success"
                    : "grid size-7 shrink-0 place-items-center rounded-lg bg-white/6 text-ink-500"
                }
              >
                {row.done ? (
                  <Check className="size-4" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>

              <span
                className={
                  row.done
                    ? "flex-1 truncate text-[13px] text-ink-400 line-through decoration-ink-500/60"
                    : "flex-1 truncate text-[13px] font-medium text-ink-100"
                }
              >
                {row.name}
              </span>

              <span className="shrink-0 font-mono text-[11px] text-ink-500">
                {row.detail}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex h-12 items-center justify-center rounded-control bg-linear-to-b from-brand-400 to-brand-600 text-sm font-semibold text-white glow-brand">
          {copy.cardCta}
        </div>
      </Surface>
    </div>
  );
}
