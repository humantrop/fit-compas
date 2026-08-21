"use client";

import { MailCheck } from "lucide-react";
import { useActionState } from "react";

import { FormError } from "@/components/auth/form-error";
import { SubmitButton } from "@/components/auth/submit-button";
import { Field, PasswordField } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { signUpAction } from "@/lib/auth/actions";
import { IDLE, type AuthErrorCopy } from "@/lib/auth/types";
import type { Locale } from "@/lib/i18n/config";

type Copy = {
  fullName: string;
  email: string;
  password: string;
  passwordHint: string;
  submit: string;
  submitting: string;
  terms: string;
};

type SentCopy = { title: string; body: string; hint: string };

export function SignupForm({
  lang,
  copy,
  sent,
  errors,
}: {
  lang: Locale;
  copy: Copy;
  sent: SentCopy;
  errors: AuthErrorCopy;
}) {
  const [state, action] = useActionState(signUpAction, IDLE);

  // With email confirmation on there is no session yet, so the form is replaced
  // rather than redirected — redirecting would bounce straight back to /login.
  if (state.status === "sent") {
    return (
      <Surface className="p-7 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-success/15 text-success">
          <MailCheck className="size-6" />
        </span>
        <h2 className="mt-5 text-lg font-semibold text-ink-50">{sent.title}</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-300">{sent.body}</p>
        <p className="mt-4 text-[12px] text-ink-500">{sent.hint}</p>
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
        label={copy.fullName}
        name="fullName"
        type="text"
        autoComplete="name"
        required
        minLength={2}
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

      <PasswordField
        label={copy.password}
        hint={copy.passwordHint}
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      <SubmitButton label={copy.submit} pendingLabel={copy.submitting} />

      <p className="text-center text-[12px] leading-relaxed text-ink-500">
        {copy.terms}
      </p>
    </form>
  );
}
