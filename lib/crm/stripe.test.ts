import { afterEach, describe, expect, it } from 'vitest';
import { isStripeConfigured, siteOrigin, stripeCheckoutReturnUrls } from './stripe';

describe('stripe helpers', () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  afterEach(() => {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;

    if (originalStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalStripeKey;
  });

  it('reports configured state from STRIPE_SECRET_KEY', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeConfigured()).toBe(false);
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    expect(isStripeConfigured()).toBe(true);
  });

  it('prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://remassistance.com///';
    const req = new Request('http://localhost:3000/api/invoices/abc/checkout', { method: 'POST' });
    expect(siteOrigin(req)).toBe('https://remassistance.com');
  });

  it('falls back to request origin when NEXT_PUBLIC_SITE_URL is unset', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const req = new Request('https://staging.remassistance.com/api/invoices/abc/checkout', { method: 'POST' });
    expect(siteOrigin(req)).toBe('https://staging.remassistance.com');
  });

  it('builds return URLs back to /i/[token]', () => {
    expect(stripeCheckoutReturnUrls('https://remassistance.com/', 'tok_123')).toEqual({
      successUrl: 'https://remassistance.com/i/tok_123?checkout=success&session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://remassistance.com/i/tok_123?checkout=cancelled',
    });
  });
});
