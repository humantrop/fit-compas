import { cn } from "@/lib/utils";

/**
 * Typographic mark: a compass needle inside a ring. Kept as inline SVG so it
 * inherits currentColor and stays crisp in the Capacitor splash/status bar.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-8", className)}
    >
      <defs>
        <linearGradient id="fc-mark" x1="4" y1="2" x2="28" y2="30">
          <stop stopColor="#7BA5FF" />
          <stop offset="0.55" stopColor="#2E6BFF" />
          <stop offset="1" stopColor="#00D4FF" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" stroke="url(#fc-mark)" strokeWidth="2" />
      <path
        d="M21.5 10.5 18 18l-7.5 3.5L14 14l7.5-3.5Z"
        fill="url(#fc-mark)"
      />
      <circle cx="16" cy="16" r="1.75" fill="#04070E" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-ink-100">
        Fit<span className="text-brand-400">Compas</span>
      </span>
    </span>
  );
}
