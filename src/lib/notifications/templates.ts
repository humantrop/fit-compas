import type { Locale } from "@/lib/i18n/config";

import type { MailMessage } from "./mail";

/**
 * The email a notification turns into.
 *
 * Hand-written table HTML with inline styles, which is not how the rest of this
 * app is built and is correct here: Gmail strips `<style>` blocks, Outlook
 * ignores flexbox and most clients ignore `prefers-color-scheme`. Anything
 * clever renders as a stack of unstyled paragraphs somewhere, and a coach's
 * message arriving looking broken is worse than one arriving looking plain.
 *
 * The palette is the app's, hard-coded, because an email cannot read
 * `globals.css`. It is repeated in exactly this one file.
 */

const BG = "#080b14";
const CARD = "#0f1421";
const BORDER = "#1e2637";
const TEXT = "#e8ecf5";
const MUTED = "#8b97ad";
const BRAND = "#2e6bff";

export type EmailCopy = {
  /** Prefix on the subject line, so the inbox groups them. */
  subjectPrefix: string;
  openLabel: string;
  footer: string;
  /** Why they are receiving this at all. */
  reason: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Newlines the trainer typed are the only formatting the body carries. */
function paragraphs(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${TEXT};">` +
        escapeHtml(block).replace(/\n/g, "<br />") +
        `</p>`,
    )
    .join("");
}

export function renderNotificationEmail({
  title,
  body,
  href,
  locale,
  siteUrl,
  copy,
  to,
}: {
  title: string;
  body: string;
  /** Locale-less app path, or null. */
  href: string | null;
  locale: Locale;
  siteUrl: string;
  copy: EmailCopy;
  to: string;
}): MailMessage {
  // The language segment is added here rather than stored, so the same
  // notification row can be mailed to a Serbian and an English reader.
  const link = `${siteUrl}/${locale}${href ?? "/dashboard"}`;

  const html = `<!doctype html>
<html lang="${locale}">
  <body style="margin:0;padding:24px 12px;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 4px 18px;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND};">
                Fit Compas
              </td>
            </tr>
            <tr>
              <td style="background:${CARD};border:1px solid ${BORDER};border-radius:16px;padding:28px 26px;">
                <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;font-weight:700;color:${TEXT};">
                  ${escapeHtml(title)}
                </h1>
                ${paragraphs(body)}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
                  <tr>
                    <td style="background:${BRAND};border-radius:10px;">
                      <a href="${link}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                        ${escapeHtml(copy.openLabel)}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 6px 0;font-size:12px;line-height:1.6;color:${MUTED};">
                ${escapeHtml(copy.reason)}<br />
                <a href="${siteUrl}/${locale}" style="color:${MUTED};">${escapeHtml(copy.footer)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  // Sent alongside the HTML, not instead of it. A message with no text part is
  // a spam signal on its own, and it is what a watch shows in the preview.
  const text = [title, "", body, "", `${copy.openLabel}: ${link}`, "", copy.reason]
    .join("\n")
    .trim();

  return {
    to,
    subject: `${copy.subjectPrefix} ${title}`.trim(),
    html,
    text,
  };
}
