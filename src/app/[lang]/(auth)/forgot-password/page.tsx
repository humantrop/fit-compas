import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/forgot-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[lang]/forgot-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.auth;

  return (
    <AuthShell
      lang={lang}
      aside={copy.aside}
      title={copy.forgot.title}
      subtitle={copy.forgot.subtitle}
      footer={
        <p className="text-center">
          <Link
            href={`/${lang}/login`}
            className="inline-flex items-center gap-2 text-[14px] font-medium text-ink-400 transition-colors hover:text-ink-200"
          >
            <ArrowLeft className="size-4" />
            {copy.forgot.back}
          </Link>
        </p>
      }
    >
      <ForgotForm lang={lang} copy={copy.forgot} errors={copy.errors} />
    </AuthShell>
  );
}
