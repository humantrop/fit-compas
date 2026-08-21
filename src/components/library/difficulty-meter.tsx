import { DIFFICULTIES, type Difficulty } from "@/lib/library/types";
import { cn } from "@/lib/utils";

/**
 * Five bars instead of the word alone.
 *
 * The enum is a 1-5 scale by design, and a client scanning a grid reads a bar
 * faster than "intermediate" — especially across three languages where the
 * words have very different lengths.
 */
export function DifficultyMeter({
  level,
  label,
  className,
}: {
  level: Difficulty;
  label: string;
  className?: string;
}) {
  const filled = DIFFICULTIES.indexOf(level) + 1;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={label}
    >
      <span aria-hidden className="flex items-end gap-0.5">
        {DIFFICULTIES.map((step, index) => (
          <span
            key={step}
            className={cn(
              "w-1 rounded-full transition-colors",
              index < filled ? "bg-brand-400" : "bg-white/12",
            )}
            style={{ height: `${6 + index * 2}px` }}
          />
        ))}
      </span>
      <span className="text-[12px] font-medium text-ink-400">{label}</span>
    </span>
  );
}
