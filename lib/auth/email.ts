import { CODE_TTL_SEC } from './code';
import { INVITE_TTL_SEC } from './invite';

/**
 * Authentication emails — MIGRATION-PLAN §10.
 *
 * Resend's built-in template sends a link and nothing else, so this replaces it
 * to carry the code too, and now also renders the manager invitation.
 *
 * Written as a table-based layout with inline styles and no external assets.
 * Mail clients strip <style> blocks, block remote images by default and ignore
 * most modern CSS; a sign-in email that renders blank is a support ticket from
 * somebody who cannot get in. Every message also ships a plain-text
 * alternative — some corporate clients show only that.
 */

const MINUTES = Math.round(CODE_TTL_SEC / 60);
const INVITE_DAYS = Math.round(INVITE_TTL_SEC / 86_400);

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface AuthEmail {
  subject: string;
  html: string;
  text: string;
}

/** Kept as the old name so existing callers and tests read unchanged. */
export type SigninEmail = AuthEmail;

/**
 * The outer card, shared by both messages.
 *
 * Extracted when the invitation arrived rather than copied: the escaping, the
 * inline-style discipline and the "no external assets" rule are the parts that
 * are easy to get subtly wrong on the second message, and a second copy is
 * where they would have drifted.
 *
 * `body` is already-escaped HTML — every caller below builds it from
 * escapeHtml'd values.
 */
function card({ heading, lede, body, footer }: {
  heading: string;
  lede: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f5f7fa;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7fa;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:460px;background:#ffffff;border-radius:14px;padding:32px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#000543;">
    <tr><td style="font-size:17px;font-weight:700;padding-bottom:6px;">${heading}</td></tr>
    <tr><td style="font-size:14px;line-height:1.6;color:#667180;padding-bottom:22px;">
      ${lede}
    </td></tr>
${body}
    <tr><td style="font-size:13px;line-height:1.6;color:#667180;border-top:1px solid #edf0f6;padding-top:18px;">
      ${footer}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** The big monospaced digits. */
function codeBlock(safeCode: string): string {
  return `    <tr><td align="center" style="padding-bottom:22px;">
      <div style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:700;letter-spacing:8px;color:#000543;background:#f5f7fa;border-radius:12px;padding:16px 12px;">${safeCode}</div>
    </td></tr>`;
}

function buttonBlock(safeUrl: string, label: string): string {
  return `    <tr><td align="center" style="padding-bottom:20px;">
      <a href="${safeUrl}" style="display:inline-block;background:#518de0;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 22px;border-radius:14px;">${label}</a>
    </td></tr>`;
}

/**
 * The code is presented first and the link second, deliberately. Corporate mail
 * scanners follow links to check them, and because the token is single-use a
 * scanner that follows this one consumes it — the classic "the link didn't
 * work" report. Typing the code is immune to that, so it leads.
 */
export function renderSigninEmail({ code, url }: { code: string; url: string }): AuthEmail {
  const safeUrl = escapeHtml(url);
  const safeCode = escapeHtml(code);

  const html = card({
    heading: 'Rem Assist admin sign-in',
    lede: 'Enter this code to finish signing in.',
    body: `${codeBlock(safeCode)}
${buttonBlock(safeUrl, 'Or sign in with one click')}`,
    footer: `The code and the link are the same single use and expire in ${MINUTES} minutes.
      If you did not ask to sign in, you can ignore this message — nobody can
      get in without this email.`,
  });

  const text = [
    'Rem Assist admin sign-in',
    '',
    `Your code: ${code}`,
    '',
    'Or open this link:',
    url,
    '',
    `The code and the link are the same single use and expire in ${MINUTES} minutes.`,
    'If you did not ask to sign in, you can ignore this message.',
  ].join('\n');

  return { subject: `${code} is your Rem Assist sign-in code`, html, text };
}

/**
 * The activation code, sent when somebody asks to prove their own address.
 *
 * The same token as a sign-in code — see sendVerificationEmail — but not the
 * same message, because it is not the same request. "Enter this code to finish
 * signing in" arriving to somebody who is already signed in and looking at a
 * countdown reads as the wrong email, and an email that reads as the wrong
 * email is one people leave alone.
 *
 * Code and no link, unlike the sign-in message: the person is already sitting
 * in front of the form. A link here would be a second thing to explain and one
 * more URL for a mail scanner to spend.
 */
export function renderActivationEmail({ code }: { code: string }): AuthEmail {
  const safeCode = escapeHtml(code);

  const html = card({
    heading: 'Activate your Rem Assist admin account',
    lede: `Type this code on the page you just opened to confirm this address.
      Until it is confirmed, the account is locked out of the admin.`,
    body: codeBlock(safeCode),
    footer: `The code expires in ${MINUTES} minutes. If you did not ask to activate
      an account, you can ignore this message — nothing changes without this code.`,
  });

  const text = [
    'Activate your Rem Assist admin account',
    '',
    `Your code: ${code}`,
    '',
    'Type it on the page you just opened to confirm this address.',
    'Until it is confirmed, the account is locked out of the admin.',
    `The code expires in ${MINUTES} minutes.`,
    'If you did not ask to activate an account, you can ignore this message.',
  ].join('\n');

  return { subject: `${code} is your Rem Assist activation code`, html, text };
}

/**
 * The invitation.
 *
 * Link only — no code in this message, and that is the design. The link proves
 * control of the inbox at invite time; opening it sends a *second* message with
 * a code that proves it again at registration. One email carrying both would
 * make a single forwarded message enough to become an account.
 *
 * The inviter's address is named so the recipient can tell an expected
 * invitation from a phishing lookalike without having to trust the link.
 */
export function renderInviteEmail({ url, invitedByEmail }: {
  url: string;
  invitedByEmail: string;
}): AuthEmail {
  const safeUrl = escapeHtml(url);
  const safeInviter = escapeHtml(invitedByEmail);

  const html = card({
    heading: 'You have been invited to the Rem Assist admin',
    lede: `<strong>${safeInviter}</strong> has invited you to manage leads in the Rem Assist
      admin. Opening the link below emails you a ${MINUTES}-minute code, and then you
      choose a password.`,
    body: buttonBlock(safeUrl, 'Accept the invitation'),
    footer: `This invitation expires in ${INVITE_DAYS} days and can only be used once.
      If you were not expecting it, you can ignore this message — no account
      exists until the invitation is accepted.`,
  });

  const text = [
    'You have been invited to the Rem Assist admin',
    '',
    `${invitedByEmail} has invited you to manage leads in the Rem Assist admin.`,
    '',
    'Open this link to accept:',
    url,
    '',
    `You will be emailed a ${MINUTES}-minute code, and then choose a password.`,
    `This invitation expires in ${INVITE_DAYS} days and can only be used once.`,
    'If you were not expecting it, you can ignore this message.',
  ].join('\n');

  return { subject: 'You have been invited to the Rem Assist admin', html, text };
}

/**
 * The second factor, sent when somebody opens their invitation link.
 *
 * A code and no link, which is the mirror image of the invitation itself. There
 * is nothing to click because the person is already sitting in front of the
 * registration form — and a link here would reintroduce exactly the prefetch
 * problem the two-message split exists to avoid.
 */
export function renderInviteCodeEmail({ code }: { code: string }): AuthEmail {
  const safeCode = escapeHtml(code);

  const html = card({
    heading: 'Your Rem Assist registration code',
    lede: 'Type this code on the page you just opened to finish setting up your account.',
    body: codeBlock(safeCode),
    footer: `The code expires in ${MINUTES} minutes. If you did not open an invitation,
      you can ignore this message — no account is created without this code.`,
  });

  const text = [
    'Your Rem Assist registration code',
    '',
    `Your code: ${code}`,
    '',
    'Type it on the page you just opened to finish setting up your account.',
    `The code expires in ${MINUTES} minutes.`,
    'If you did not open an invitation, you can ignore this message.',
  ].join('\n');

  return { subject: `${code} is your Rem Assist registration code`, html, text };
}
