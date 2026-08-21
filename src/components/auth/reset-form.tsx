"use client";

import { useActionState } from "react";

import { FormError } from "@/components/auth/form-error";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/ui/field";
import { updatePasswordAction } from "@/lib/auth/actions";
import { IDLE, type AuthErrorCopy } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

type Copy = {
  password: string;
  confirmPassword: string;
  submit: string;
  submitting: string;
};

export function ResetForm({
  lang,
  copy,
  errors,
}: {
  lang: Locale;
  copy: Copy;
  errors: AuthErrorCopy;
}) {
  const [state, action] = useActionState(updatePasswordAction, IDLE);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="lang" value={lang} />

      <FormError
        message={state.status === "error" && state.code ? errors[state.code] : undefined}
      />

      <PasswordField
        label={copy.password}
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <PasswordField
        label={copy.confirmPassword}
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />
    </form>
  );
}
