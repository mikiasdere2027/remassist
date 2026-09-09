import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FROM, mailFrom, printLocally, sendAuthEmail } from './mailer';

/**
 * The rule this module exists to enforce: a live sign-in credential is never
 * written to a log in production.
 *
 * Worth testing rather than reading, because the failure is silent — printing
 * still "works", the sign-in still succeeds, and the only symptom is codes for
 * company addresses sitting in journalctl where anyone with box access can
 * replay them.
 */
const saved = {
  env: process.env.NODE_ENV,
  key: process.env.AUTH_RESEND_KEY,
  from: process.env.AUTH_EMAIL_FROM,
};

function setEnv(name: 'NODE_ENV', value: string) {
  /* NODE_ENV is readonly on the typed process.env, and Next sets it for real at
     build time, so defining it is the only way to exercise both branches from a
     test. process.env rejects a descriptor that is not also writable and
     enumerable, hence all three flags. */
  Object.defineProperty(process.env, name, {
    value, configurable: true, writable: true, enumerable: true,
  });
}

afterEach(() => {
  setEnv('NODE_ENV', saved.env ?? 'test');
  if (saved.key === undefined) delete process.env.AUTH_RESEND_KEY;
  else process.env.AUTH_RESEND_KEY = saved.key;
  if (saved.from === undefined) delete process.env.AUTH_EMAIL_FROM;
  else process.env.AUTH_EMAIL_FROM = saved.from;
});

describe('printLocally', () => {
  it('is true only with no key AND outside production', () => {
    setEnv('NODE_ENV', 'development');
    delete process.env.AUTH_RESEND_KEY;
    expect(printLocally()).toBe(true);
  });

  it('is false in production even when no key is configured', () => {
    // The important one. A deployed box with a missing key must fail loudly,
    // not fall back to writing codes into the application log.
    setEnv('NODE_ENV', 'production');
    delete process.env.AUTH_RESEND_KEY;
    expect(printLocally()).toBe(false);
  });

  it('is false as soon as a real key exists, even in development', () => {
    setEnv('NODE_ENV', 'development');
    process.env.AUTH_RESEND_KEY = 're_something';
    expect(printLocally()).toBe(false);
  });

  it('is read at call time, not frozen at import', () => {
    // A module constant would capture whatever the environment looked like when
    // the graph was first walked, which in a server is before any request.
    setEnv('NODE_ENV', 'production');
    expect(printLocally()).toBe(false);
    setEnv('NODE_ENV', 'development');
    delete process.env.AUTH_RESEND_KEY;
    expect(printLocally()).toBe(true);
  });
});

describe('sendAuthEmail with no key in production', () => {
  beforeEach(() => {
    setEnv('NODE_ENV', 'production');
    delete process.env.AUTH_RESEND_KEY;
  });

  it('throws rather than pretending to send', async () => {
    // Silence here would tell somebody to check an inbox that will never
    // receive anything. The caller turns this into a visible message.
    await expect(sendAuthEmail({
      to: 'a@remassistance.com',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      localPreview: 'THE-SECRET-CODE',
    })).rejects.toThrow(/AUTH_RESEND_KEY/);
  });

  it('does not put the credential preview in the error it throws', async () => {
    const err = await sendAuthEmail({
      to: 'a@remassistance.com',
      subject: 's',
      html: '<p>h</p>',
      text: 't',
      localPreview: 'THE-SECRET-CODE',
    }).catch((e: Error) => e);
    expect(String(err)).not.toContain('THE-SECRET-CODE');
  });
});

describe('mailFrom', () => {
  it('falls back to the verified sending subdomain', () => {
    delete process.env.AUTH_EMAIL_FROM;
    // A subdomain, never the apex: the apex MX/SPF/DKIM records for both
    // company domains belong to Microsoft 365 and must not be touched.
    expect(mailFrom()).toBe(DEFAULT_FROM);
    expect(mailFrom()).toContain('@auth.remconnect.io');
  });

  it('prefers the configured address', () => {
    process.env.AUTH_EMAIL_FROM = 'Rem <no-reply@auth.remassistance.com>';
    expect(mailFrom()).toBe('Rem <no-reply@auth.remassistance.com>');
  });
});
