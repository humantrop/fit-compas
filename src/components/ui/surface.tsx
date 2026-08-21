import { cn } from "@/lib/utils";

type SurfaceProps<T extends React.ElementType> = {
  as?: T;
  /** `strong` reads as raised — use for the focal card in a bento grid. */
  tone?: "default" | "strong" | "bare";
  /** Adds the gradient hairline along the top edge. */
  edge?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "tone" | "edge">;

/**
 * The single definition of a glass panel. Every card in the app goes through
 * here — no ad-hoc `bg-white/5 backdrop-blur` anywhere else, or the surfaces
 * drift apart and the whole thing stops reading as one system.
 */
export function Surface<T extends React.ElementType = "div">({
  as,
  tone = "default",
  edge = false,
  className,
  children,
  ...props
}: SurfaceProps<T>) {
  const Component = (as ?? "div") as React.ElementType;

  return (
    <Component
      className={cn(
        "relative overflow-hidden rounded-card",
        tone === "default" && "glass",
        tone === "strong" && "glass-strong",
        tone === "bare" && "border border-white/6 bg-base-900/60",
        className,
      )}
      {...props}
    >
      {edge ? (
        <span
          aria-hidden
          className="edge-top pointer-events-none absolute inset-x-0 top-0 h-px"
        />
      ) : null}
      {children}
    </Component>
  );
}
