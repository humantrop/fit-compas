import Link from "next/link";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-control " +
  "font-semibold tracking-tight whitespace-nowrap transition-all duration-200 " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "bg-linear-to-b from-brand-400 to-brand-600 text-white glow-brand " +
    "hover:from-brand-300 hover:to-brand-500 hover:shadow-[0_10px_32px_-8px_rgb(46_107_255/0.85)]",
  secondary:
    "glass text-ink-100 hover:border-white/16 hover:bg-white/8",
  ghost:
    "text-ink-300 hover:bg-white/6 hover:text-ink-100",
};

/* Sizes keep every target at or above 44px so the Capacitor build is usable
   with a thumb. `sm` is the one exception and is desktop-chrome only. */
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[15px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: CommonProps & React.ComponentPropsWithoutRef<typeof Link>) {
  return (
    <Link
      href={href}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
