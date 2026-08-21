import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale, locales, localeTags } from "@/lib/i18n/config";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};

  const dict = await getDictionary(lang);

  return {
    title: {
      default: dict.meta.title,
      template: "%s · Fit Compas",
    },
    description: dict.meta.description,
    applicationName: "Fit Compas",
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      siteName: "Fit Compas",
      locale: localeTags[lang],
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

/* Dark chrome in the browser and in the Capacitor status bar. */
export const viewport = {
  themeColor: "#060A13",
  colorScheme: "dark" as const,
  width: "device-width",
  initialScale: 1,
  // Lets the layout paint under the notch; safe-area utilities handle the insets.
  viewportFit: "cover" as const,
};

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <html
      lang={localeTags[lang]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
