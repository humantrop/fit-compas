import { Clock, Lock, SearchX } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";

/**
 * The three things the library shows instead of a grid: nothing matched, the
 * shelf is not built yet, or the reader has no active subscription. They share
 * a shape so the page reads the same in all three cases.
 */
function Notice({
  icon,
  tone = "neutral",
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  tone?: "neutral" | "locked";
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <Surface
      tone="strong"
      edge
      className="flex flex-col items-center gap-4 px-6 py-14 text-center"
    >
      <span
        className={
          tone === "locked"
            ? "grid size-12 place-items-center rounded-full border border-warn/25 bg-warn/12 text-warn"
            : "grid size-12 place-items-center rounded-full border border-white/10 bg-white/5 text-ink-400"
        }
      >
        {icon}
      </span>

      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-ink-50">{title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-400">{body}</p>
      </div>

      {action ? (
        <ButtonLink href={action.href} variant="secondary" size="md">
          {action.label}
        </ButtonLink>
      ) : null}
    </Surface>
  );
}

export function EmptyNotice({ title, body }: { title: string; body: string }) {
  return <Notice icon={<SearchX className="size-5" />} title={title} body={body} />;
}

export function PendingNotice({ title, body }: { title: string; body: string }) {
  return <Notice icon={<Clock className="size-5" />} title={title} body={body} />;
}

/**
 * What a client without an active subscription sees. Feature 18 replaces the
 * action with a link into Polar checkout — `getAccess()` already decides who
 * lands here, so nothing else on the screen has to change.
 */
export function LockedNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { href: string; label: string };
}) {
  return (
    <Notice
      icon={<Lock className="size-5" />}
      tone="locked"
      title={title}
      body={body}
      action={action}
    />
  );
}
