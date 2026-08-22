"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { changePasswordAction } from "@/lib/account/actions";
import type { AccountCopy } from "@/lib/account/copy";
import { ACCOUNT_IDLE, PASSWORD_MIN } from "@/lib/account/types";
import type { Locale } from "@/lib/i18n/config";

/**
 * Change the password, with the current one.
 *
 * Three fields rather than two. Supabase is happy to change a password from a
 * session alone, and that is exactly the door this closes: an unlocked phone on
 * a gym bench is a session, and without this field anybody holding it could
 * lock the owner out in two taps. The action re-authenticates rather than
 * trusting the field — see `lib/account/actions.ts`.
 *
 * The form empties itself on success. A password left sitting in three inputs
 * on a shared screen is the small version of the problem the whole card exists
 * to solve, and "Saved." above still-filled fields reads as though it did not
 * take.
 *
 * The link out to the reset flow is there because somebody who cannot remember
 * their current password cannot use this form at all, and the alternative is
 * signing out to find the "forgot password" link on the login screen.
 */
export function PasswordForm({
  lang,
  copy,
}: {
  lang: Locale;
  copy: AccountCopy;
}) {
  const [state, action, pending] = useActionState(
    changePasswordAction,
    ACCOUNT_IDLE,
  );
  const form = useRef<HTMLFormElement>(null);
  const text = copy.password;

  useEffect(() => {
    if (state.status === "saved") form.current?.reset();
  }, [state]);

  return (
    <Surface className="p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold text-ink-100">{text.title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-400">
        {text.subtitle}
      </p>

      <form ref={form} action={action} className="mt-5 flex flex-col gap-4">
        <PasswordField
          label={text.current}
          name="currentPassword"
          autoComplete="current-password"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField
            label={text.next}
            name="password"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            hint={text.hint}
            required
          />
          <PasswordField
            label={text.confirm}
            name="confirmPassword"
            autoComplete="new-password"
            minLength={PASSWORD_MIN}
            required
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? text.saving : text.submit}
          </Button>

          <Link
            href={`/${lang}/forgot-password`}
            className="text-[13px] text-ink-400 underline-offset-4 transition-colors hover:text-ink-200 hover:underline"
          >
            {text.forgot}
          </Link>
        </div>

        {state.status === "saved" ? (
          <p className="text-[13px] text-success">{text.saved}</p>
        ) : null}

        {state.status === "error" && state.code ? (
          <p role="alert" className="text-[13px] text-danger">
            {copy.errors[state.code]}
          </p>
        ) : null}
      </form>
    </Surface>
  );
}
