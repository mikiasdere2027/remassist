import { describe, expect, it } from 'vitest';
import { renderInviteCodeEmail, renderInviteEmail, renderSigninEmail } from './email';

const CODE = '483920';
const URL_ = 'https://remassistance.com/api/auth/callback/resend?token=483920&email=a%40b.com';

describe('renderSigninEmail', () => {
  const mail = renderSigninEmail({ code: CODE, url: URL_ });

  it('puts the code in the subject, so it is readable from a notification', () => {
    expect(mail.subject).toContain(CODE);
  });

  it('carries both the code and the link in both parts', () => {
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain(CODE);
      expect(body).toContain('token=483920');
    }
  });

  it('always ships a plain-text alternative', () => {
    // Some corporate clients render only this. An empty text part is an email
    // that arrives blank for exactly the people who need to sign in.
    expect(mail.text.trim().length).toBeGreaterThan(50);
  });

  it('states the expiry, so nobody sits on a dead code', () => {
    expect(mail.text).toMatch(/expire in 15 minutes/);
    expect(mail.html).toMatch(/expire in 15 minutes/);
  });

  it('tells an unexpecting recipient they can ignore it', () => {
    expect(mail.text.toLowerCase()).toContain('ignore');
    expect(mail.html.toLowerCase()).toContain('ignore');
  });

  it('references no external assets, which mail clients block', () => {
    expect(mail.html).not.toMatch(/<img/i);
    expect(mail.html).not.toMatch(/<link/i);
    expect(mail.html).not.toMatch(/<style/i);
    expect(mail.html).not.toMatch(/<script/i);
  });

  it('escapes the url instead of interpolating it raw into the href', () => {
    const evil = renderSigninEmail({
      code: CODE,
      url: 'https://x.test/?a="><script>alert(1)</script>',
    });
    expect(evil.html).not.toContain('<script>alert(1)</script>');
    expect(evil.html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('renders a code with leading zeros verbatim', () => {
    const padded = renderSigninEmail({ code: '000123', url: URL_ });
    expect(padded.subject).toContain('000123');
    expect(padded.text).toContain('000123');
    expect(padded.html).toContain('000123');
  });
});

describe('renderInviteEmail', () => {
  const INVITE_URL = 'https://remassistance.com/admin/invite/abc123';
  const mail = renderInviteEmail({ url: INVITE_URL, invitedByEmail: 'boss@remassistance.com' });

  it('carries the link in both parts', () => {
    for (const body of [mail.html, mail.text]) {
      expect(body).toContain(INVITE_URL);
    }
  });

  it('carries NO sign-in code', () => {
    // The two factors travel in two messages. One email holding both would
    // make a single forwarded message enough to become an account.
    //
    // Checked on the text part for a bare six-digit run — the html part is
    // full of six-digit hex colours, so the same regex there matches #000543
    // and proves nothing. The html is checked for the code block instead.
    expect(mail.text).not.toMatch(/\b\d{6}\b/);
    expect(mail.html).not.toContain('letter-spacing:8px');
  });

  it('names the inviter, so a lookalike is recognisable without trusting the link', () => {
    expect(mail.html).toContain('boss@remassistance.com');
    expect(mail.text).toContain('boss@remassistance.com');
  });

  it('states the seven-day expiry and that it is single use', () => {
    for (const body of [mail.html, mail.text]) {
      expect(body).toMatch(/expires in 7 days/);
      expect(body.toLowerCase()).toContain('once');
    }
  });

  it('tells an unexpecting recipient they can ignore it', () => {
    expect(mail.text.toLowerCase()).toContain('ignore');
    expect(mail.html.toLowerCase()).toContain('ignore');
  });

  it('always ships a plain-text alternative', () => {
    expect(mail.text.trim().length).toBeGreaterThan(50);
  });

  it('references no external assets, which mail clients block', () => {
    expect(mail.html).not.toMatch(/<img/i);
    expect(mail.html).not.toMatch(/<link/i);
    expect(mail.html).not.toMatch(/<style/i);
    expect(mail.html).not.toMatch(/<script/i);
  });

  it('escapes both the url and the inviter address', () => {
    // The inviter address reaches this from a database row, and the row came
    // from a form. It is escaped for the same reason the url is.
    const evil = renderInviteEmail({
      url: 'https://x.test/?a="><script>alert(1)</script>',
      invitedByEmail: '"><script>alert(2)</script>@x.test',
    });
    expect(evil.html).not.toContain('<script>alert(1)</script>');
    expect(evil.html).not.toContain('<script>alert(2)</script>');
    expect(evil.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});

describe('renderInviteCodeEmail', () => {
  const mail = renderInviteCodeEmail({ code: '004271' });

  it('puts the code in the subject, so it is readable from a notification', () => {
    expect(mail.subject).toContain('004271');
  });

  it('carries the code verbatim in both parts, leading zeros included', () => {
    expect(mail.html).toContain('004271');
    expect(mail.text).toContain('004271');
  });

  it('carries NO link', () => {
    // The mirror image of the invitation. A link here would reintroduce the
    // mail-scanner prefetch problem the two-message split exists to avoid,
    // and the person is already on the page anyway.
    expect(mail.html).not.toMatch(/<a\s/i);
    expect(mail.text).not.toMatch(/https?:\/\//);
  });

  it('states the expiry and offers a way out to an unexpecting recipient', () => {
    for (const body of [mail.html, mail.text]) {
      expect(body).toMatch(/expires in 15 minutes/);
      expect(body.toLowerCase()).toContain('ignore');
    }
  });

  it('references no external assets, which mail clients block', () => {
    expect(mail.html).not.toMatch(/<img/i);
    expect(mail.html).not.toMatch(/<link/i);
    expect(mail.html).not.toMatch(/<style/i);
    expect(mail.html).not.toMatch(/<script/i);
  });
});
