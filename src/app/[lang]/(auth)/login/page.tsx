import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function LoginPage({ params }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.auth;

  return (
    <AuthShell
      lang={lang}
      aside={copy.aside}
      title={copy.login.title}
      subtitle={copy.login.subtitle}
      footer={
        <p className="text-center text-[14px] text-ink-400">
          {copy.login.noAccount}{" "}
          <Link
            href={`/${lang}/signup`}
            className="font-semibold text-brand-300 transition-colors hover:text-brand-200"
          >
            {copy.login.signupLink}
          </Link>
        </p>
      }
    >
      {/* LoginForm reads ?next and ?error, so it needs a boundary while the
          page is prerendered. */}
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm lang={lang} copy={copy.login} errors={copy.errors} />
      </Suspense>
    </AuthShell>
  );
}
