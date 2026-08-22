"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { saveProfileAction } from "@/lib/account/actions";
import type { AccountCopy } from "@/lib/account/copy";
import { ACCOUNT_IDLE, NAME_MAX, NAME_MIN } from "@/lib/account/types";

/**
 * The name, and the address it is attached to.
 *
 * The email is shown and not editable. Changing it in Supabase means a
 * confirmation round trip to *both* addresses and an account that is briefly
 * signed in under one and identified by the other — a flow worth building
 * properly or not at all, and this app has one trainer who can do it by hand.
 * Saying so on the screen beats a disabled field with no explanation.
 *
 * `minLength`/`maxLength` mirror what the action enforces. The browser check is
 * a courtesy; the action re-checks because a Server Action is reachable by a
 * direct POST that never saw this form.
 */
export function ProfileForm({
  fullName,
  email,
  emailConfirmed,
  meta,
  copy,
}: {
  fullName: string | null;
  email: string | null;
  emailConfirmed: boolean;
  /** "Client · Member since 4 March 2026", assembled on the server. */
  meta: string;
  copy: AccountCopy;
}) {
  const [state, action, pending] = useActionState(saveProfileAction, ACCOUNT_IDLE);
  const text = copy.identity;

  return (
    <Surface className="p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-100">{text.title}</h2>
      <p className="mt-1 text-[13px] text-ink-400">{text.subtitle}</p>

      <form action={action} className="mt-5 flex flex-col gap-4">
        <Field
          label={text.name}
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={fullName ?? ""}
          placeholder={text.namePlaceholder}
          minLength={NAME_MIN}
          maxLength={NAME_MAX}
          required
        />

        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-300">{text.email}</span>
          <p className="text-[15px] text-ink-200 break-all">{email ?? "—"}</p>
          {emailConfirmed ? null : (
            <p className="text-[12px] text-warn">{text.unconfirmed}</p>
          )}
          <p className="text-[12px] leading-relaxed text-ink-500">
            {text.emailNote}
          </p>
        </div>

        <p className="text-[12px] text-ink-500">{meta}</p>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? text.saving : text.save}
          </Button>

          {state.status === "saved" ? (
            <p className="text-[13px] text-success">{text.saved}</p>
          ) : null}

          {state.status === "error" && state.code ? (
            <p role="alert" className="text-[13px] text-danger">
              {copy.errors[state.code]}
            </p>
          ) : null}
        </div>
      </form>
    </Surface>
  );
}
