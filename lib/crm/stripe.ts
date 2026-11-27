import Stripe from 'stripe';

/**
 * Stripe Checkout helper for public invoice card payments (/i/[token]).
 * Lazy-initialized so Next.js builds succeed even when STRIPE_SECRET_KEY is unset.
 */
let cachedStripe: { key: string; client: Stripe } | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  if (cachedStripe && cachedStripe.key === key) return cachedStripe.client;
  const client = new Stripe(key);
  cachedStripe = { key, client };
  return client;
}

/** Resolve canonical site origin for Stripe Checkout return URLs. */
export function siteOrigin(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  return new URL(req.url).origin;
}

/** Build Stripe Checkout success and cancel URLs that return the customer to /i/[token]. */
export function stripeCheckoutReturnUrls(origin: string, token: string): { successUrl: string; cancelUrl: string } {
  const base = `${origin.replace(/\/+$/, '')}/i/${encodeURIComponent(token)}`;
  return {
    successUrl: `${base}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}?checkout=cancelled`,
  };
}
