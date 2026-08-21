import "server-only";

/**
 * Sending an email, behind an interface — the same arrangement `lib/video/`
 * uses for storage and `lib/billing/access.ts` uses for the paywall.
 *
 * The roadmap puts the real mail service at feature 17 (Resend replacing the
 * Supabase mailer, which sends two messages an hour and lands in spam). Feature
 * 15 needs to send *now*, so it defines the seam and ships one transport
 * against it. Feature 17 changes which transport is registered and the
 * auth-mail templates — it does not touch a single call site here.
 *
 * **There is no fake transport.** When nothing is configured `getMailer()`
 * returns null and dispatch marks the delivery `email_status = 'none'` rather
 * than queueing it. A stub that logs and reports success would leave a table
 * full of rows claiming an email went out, and the first time somebody asks
 * "did they get it?" the database would lie. The admin screen shows a banner
 * instead, so the state is visible where it matters.
 */

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailResult = { ok: true } | { ok: false; error: string };

export type Mailer = {
  /** Recorded in logs so a failed send says which transport failed. */
  name: string;
  send(message: MailMessage): Promise<MailResult>;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Who the mail comes from.
 *
 * Resend's shared `onboarding@resend.dev` sender works without a verified
 * domain but will only deliver to the account owner's own address — fine for
 * checking the wiring, useless for clients. Feature 17 verifies the real domain
 * and sets this.
 */
function fromAddress(): string {
  return process.env.NOTIFICATIONS_FROM_EMAIL ?? "Fit Compas <onboarding@resend.dev>";
}

function resendMailer(apiKey: string): Mailer {
  return {
    name: "resend",
    async send(message) {
      try {
        const response = await fetch(RESEND_ENDPOINT, {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            from: fromAddress(),
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });

        if (response.ok) return { ok: true };

        // Read the body for the reason — Resend puts a usable sentence in
        // there ("domain not verified", "invalid recipient") and storing the
        // status code alone turns every failure into the same mystery.
        const detail = await response.text().catch(() => "");
        return {
          ok: false,
          error: `resend ${response.status}: ${detail.slice(0, 300)}`,
        };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "network error",
        };
      }
    },
  };
}

/** Null when no transport is configured. Callers must handle that. */
export function getMailer(): Mailer | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? resendMailer(apiKey) : null;
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
