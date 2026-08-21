"use client";

import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/runner/timeline";

/**
 * The countdown ring. Used for a timed set and for a rest, in different
 * colours, because at arm's length the colour is what tells you which one
 * you are looking at before the words register.
 */
export function RunnerRing({
  remaining,
  total,
  tone = "brand",
  label,
  className,
}: {
  remaining: number;
  total: number;
  tone?: "brand" | "glow";
  label?: string;
  className?: string;
}) {
  const size = 220;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const fraction = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const seconds = Math.ceil(remaining);
  // Under ten seconds the digits start to matter more than the ring.
  const urgent = seconds <= 10 && total > 10;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-white/8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn(
            "transition-[stroke-dashoffset] duration-200 ease-linear",
            urgent ? "text-warn" : tone === "glow" ? "text-glow" : "text-brand-400",
          )}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-mono text-5xl font-semibold tabular-nums tracking-tight",
            urgent ? "text-warn" : "text-ink-50",
          )}
          // Read out as the timer changes would be unusable; the surrounding
          // copy already says what is happening.
          aria-hidden
        >
          {formatClock(seconds)}
        </span>
        {label ? (
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
