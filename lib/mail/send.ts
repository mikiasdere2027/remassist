/**
 * Plain transactional email through Resend — the same account and key as the
 * admin sign-in mail (lib/auth/mailer.ts), but with its own From and an
 * optional Reply-To, for site notifications rather than auth.
 *
 * The From domain must be verified in Resend, or every send is refused with a
 * 403 (see deploy/README.md: verify a subdomain, never a company apex whose
 * mail records belong to Microsoft 365 / the client's mail host).
 *
 * In development with no key the message is printed instead of sent, so forms
 * can be exercised locally without mailing anyone.
 */
export interface Email {
  from: string;
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export function emailIsLocalOnly(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.AUTH_RESEND_KEY;
}

export async function sendEmail(mail: Email): Promise<void> {
  if (emailIsLocalOnly()) {
    console.log(`[mail:local] to=${String(mail.to)} subject=${mail.subject}\n${mail.text}`);
    return;
  }
  const apiKey = process.env.AUTH_RESEND_KEY;
  if (!apiKey) throw new Error('AUTH_RESEND_KEY is not set, so no mail can be sent');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend refused the email (${res.status}): ${await res.text()}`);
}
