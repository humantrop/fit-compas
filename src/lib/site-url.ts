import "server-only";

import { headers } from "next/headers";

/**
 * Absolute origin for links that leave the app and come back — Supabase email
 * confirmations and Polar checkout returns.
 *
 * Order matters: an explicit NEXT_PUBLIC_SITE_URL wins so preview deployments
 * can be pointed at production when you want the real redirect chain, and the
 * request headers are the last resort so localhost still works.
 */
export async function getSiteUrl(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  return host ? `${protocol}://${host}` : "http://localhost:3000";
}
