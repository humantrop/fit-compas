"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { FormError } from "@/components/auth/form-error";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, PasswordField } from "@/components/ui/field";
import { signInAction } from "@/lib/auth/actions";
import { IDLE, type AuthErrorCopy } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

type Copy = {
  email: string;
  password: string;
  submit: string;
  submitting: string;
  forgot: string;
};

export function LoginForm({
  lang,
  copy,
  errors,
}: {
  lang: Locale;
  copy: Copy;
  errors: AuthErrorCopy;
}) {
  const [state, action] = useActionState(signInAction, IDLE);
  const params = useSearchParams();

  // `next` is set by the proxy when it bounces an unauthenticated request.
  // `error` is set by /api/auth/confirm when an email link has expired.
  const next = params.get("next") ?? "";
  const linkError = params.get("error") === "invalid_link" ? "invalid_link" : null;

  const message =
    state.status === "error" && state.code
      ? errors[state.code]
      : linkError
        ? errors.invalid_link
        : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="next" value={next} />

      <FormError message={message} />

      <Field
        label={copy.email}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="ime@primer.com"
      />

      <div>
        <PasswordField
          label={copy.password}
          name="password"
          autoComplete="current-password"
          required
        />
        <Link
          href={`/${lang}/forgot-password`}
          className="mt-2.5 inline-block text-[13px] font-medium text-brand-300 transition-colors hover:text-brand-200"
        >
          {copy.forgot}
        </Link>
      </div>

      <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />
    </form>
  );
}
