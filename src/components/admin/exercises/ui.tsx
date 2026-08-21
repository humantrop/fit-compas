import { cn } from "@/lib/utils";

/**
 * Small shared pieces for the exercise screens.
 *
 * `control` repeats the class list that components/ui/field.tsx exports as
 * `fieldControl`, and the two are meant to stay identical. It is not imported
 * because field.tsx is a `"use client"` module: every export of one of those
 * becomes a client reference when a Server Component pulls it in, so the
 * string would arrive as a proxy rather than as a string. This file has to
 * stay server-safe — exercise-card.tsx is a Server Component and uses `Chip`.
 */
export const control =
  "h-12 w-full rounded-control border border-white/10 bg-white/4 px-4 text-[15px] " +
  "text-ink-100 outline-none transition-all placeholder:text-ink-500 " +
  "hover:border-white/16 focus:border-brand-500/60 focus:bg-white/6 " +
  "focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50";

/** Same skin, sized for a select's own arrow and for multi-line text. */
export const selectControl = cn(control, "appearance-none pr-10");
export const textareaControl =
  "min-h-28 w-full rounded-control border border-white/10 bg-white/4 px-4 py-3 " +
  "text-[15px] leading-relaxed text-ink-100 outline-none transition-all " +
  "placeholder:text-ink-500 hover:border-white/16 focus:border-brand-500/60 " +
  "focus:bg-white/6 focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50";

export function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-[13px] font-medium text-ink-300", className)}>
      {children}
    </span>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] leading-relaxed text-ink-500">{children}</p>;
}

/** Read-only tag on a card: muscle, equipment, difficulty. */
export function Chip({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "brand" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2.5 py-1",
        "text-[11px] font-medium",
        tone === "muted" && "border-white/8 bg-white/4 text-ink-400",
        tone === "brand" && "border-brand-500/25 bg-brand-500/12 text-brand-200",
        tone === "warn" && "border-amber-400/25 bg-amber-400/12 text-amber-200",
      )}
    >
      {children}
    </span>
  );
}

export function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const mb = bytes / 1_048_576;
  return mb >= 10 ? `${Math.round(mb)} MB` : `${mb.toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
