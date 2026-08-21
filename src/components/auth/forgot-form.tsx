"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";

import { FormError } from "@/components/auth/form-error";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { requestPasswordResetAction } from "@/lib/auth/actions";
import { IDLE, type AuthErrorCopy } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

type Copy = {
  email: string;
  submit: string;
  submitting: string;
  sentTitle: string;
  sentBody: string;
};

export function ForgotForm({
  lang,
  copy,
  errors,
}: {
  lang: Locale;
  copy: Copy;
  errors: AuthErrorCopy;
}) {
  const [state, action] = useActionState(requestPasswordResetAction, IDLE);

  // "sent" is returned whether or not the address has an account, so this
  // screen cannot be used to enumerate which emails are registered.
  if (state.status === "sent") {
    return (
      <Surface className="p-7 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-ink-50">{copy.sentTitle}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-300">
          {copy.sentBody}
        </p>
      </Surface>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="lang" value={lang} />

      <FormError
        message={state.status === "error" && state.code ? errors[state.code] : undefined}
      />

      <Field
        label={copy.email}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="ime@primer.com"
      />

      <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />
    </form>
  );
}
