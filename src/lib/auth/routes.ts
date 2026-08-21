/**
 * Route classification used by the proxy for optimistic redirects only.
 *
 * This is a UX shortcut, not the security boundary — the proxy sees a cookie,
 * not a verified role. Every protected page and action re-checks the session
 * server-side via `requireUser` / `requireAdmin`.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/library",
  "/workout",
  "/plan",
  "/progress",
  "/account",
  "/admin",
];

const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password"];

/** Strips the locale segment: "/sr/library/x" -> "/library/x". */
export function stripLocale(pathname: string): string {
  const rest = pathname.split("/").slice(2).join("/");
  return `/${rest}`;
}

export function isProtectedPath(path: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function isAuthPath(path: string): boolean {
  return AUTH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
