import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function SignupPage({ params }: PageProps<"/[lang]/signup">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.auth;

  return (
    <AuthShell
      lang={lang}
      aside={copy.aside}
      title={copy.signup.title}
      subtitle={copy.signup.subtitle}
      footer={
        <p className="text-center text-[14px] text-ink-400">
          {copy.signup.hasAccount}{" "}
          <Link
            href={`/${lang}/login`}
            className="font-semibold text-brand-300 transition-colors hover:text-brand-200"
          >
            {copy.signup.loginLink}
          </Link>
        </p>
      }
    >
      <SignupForm
        lang={lang}
        copy={copy.signup}
        sent={copy.checkEmail}
        errors={copy.errors}
      />
    </AuthShell>
  );
}
