import { cn } from "@/lib/utils";

/** Small labelled pill that opens a section. Replaces MFW's bare grey headings. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-brand-500/25",
        "bg-brand-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase",
        "tracking-[0.14em] text-brand-200",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-glow shadow-[0_0_8px_rgb(0_212_255/0.9)]" />
      {children}
    </span>
  );
}
