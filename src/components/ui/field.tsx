"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

const inputBase =
  "h-12 w-full rounded-control border border-white/10 bg-white/4 px-4 text-[15px] " +
  "text-ink-100 outline-none transition-all placeholder:text-ink-500 " +
  "hover:border-white/16 focus:border-brand-500/60 focus:bg-white/6 " +
  "focus:ring-4 focus:ring-brand-500/15 disabled:opacity-50";

export function Field({ label, hint, className, ...props }: FieldProps) {
  const id = useId();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-300">
        {label}
      </label>
      <input id={id} className={inputBase} {...props} />
      {hint ? <p className="text-[12px] text-ink-500">{hint}</p> : null}
    </div>
  );
}

/** Password field with a reveal toggle — typing a password blind on a phone
 *  keyboard is the most common reason a login attempt fails twice. */
export function PasswordField({ label, hint, className, ...props }: FieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink-300">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          className={cn(inputBase, "pr-12")}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={label}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-ink-400 transition-colors hover:text-ink-200"
        >
          {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
        </button>
      </div>

      {hint ? <p className="text-[12px] text-ink-500">{hint}</p> : null}
    </div>
  );
}
