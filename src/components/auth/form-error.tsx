import { AlertCircle } from "lucide-react";

export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className="flex items-start gap-2.5 rounded-control border border-danger/25 bg-danger/10 px-4 py-3 text-[13px] leading-relaxed text-danger"
    >
      <AlertCircle className="mt-px size-4 shrink-0" />
      {message}
    </p>
  );
}
