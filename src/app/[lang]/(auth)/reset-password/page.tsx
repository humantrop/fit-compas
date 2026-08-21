import { notFound } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetForm } from "@/components/auth/reset-form";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

/**
 * Reached only through the recovery link, which lands on /api/auth/confirm and
 * establishes a session before redirecting here. Without that session
 * updateUser() fails and the form surfaces "invalid_link".
 */
export default async function ResetPasswordPage({
  params,
}: PageProps<"/[lang]/reset-password">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const copy = dict.auth;

  return (
    <AuthShell
      lang={lang}
      aside={copy.aside}
      title={copy.reset.title}
      subtitle={copy.reset.subtitle}
    >
      <ResetForm lang={lang} copy={copy.reset} errors={copy.errors} />
    </AuthShell>
  );
}
