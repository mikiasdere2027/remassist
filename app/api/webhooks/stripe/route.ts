import type Stripe from 'stripe';
import { getDb, isDatabaseConfigured } from '@/db';
import { isoDay } from '@/lib/crm/engagements';
import { recordStripePayment } from '@/lib/crm/invoicesData';
import { getStripe, isStripeConfigured } from '@/lib/crm/stripe';

export const dynamic = 'force-dynamic';

/**
 * Stripe webhook handler. Verifies the Stripe-Signature header against
 * STRIPE_WEBHOOK_SECRET and records card payments idempotently against
 * the matching invoice when Checkout completes.
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || !isStripeConfigured() || !isDatabaseConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing signature', { status: 400 });
  }

  const raw = await req.text();
  if (raw.length > 512_000) {
    return new Response('Too large', { status: 413 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe] invalid webhook signature', err);
    return new Response('Invalid signature', { status: 401 });
  }

  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return Response.json({ ok: true, ignored: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== 'paid') {
    return Response.json({ ok: true, ignored: true });
  }

  const invoiceId = session.metadata?.invoiceId ?? session.client_reference_id;
  if (!invoiceId) {
    return Response.json({ ok: true, ignored: true, reason: 'missing_invoice_id' });
  }

  const amountCents = session.amount_total ?? 0;
  const reference = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;

  try {
    const result = await getDb().transaction((tx) =>
      recordStripePayment(tx, invoiceId, {
        amountCents,
        receivedOn: isoDay(new Date()),
        reference,
      }),
    );
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('[stripe] could not record payment', err);
    return new Response('Error', { status: 500 });
  }
}
