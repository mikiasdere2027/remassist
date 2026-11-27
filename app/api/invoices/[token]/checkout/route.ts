import { isDatabaseConfigured } from '@/db';
import { balance, canSettle } from '@/lib/crm/invoices';
import { invoiceByToken } from '@/lib/crm/invoicesData';
import { getStripe, isStripeConfigured, siteOrigin, stripeCheckoutReturnUrls } from '@/lib/crm/stripe';

export const dynamic = 'force-dynamic';

/**
 * Creates a Stripe Checkout Session for the remaining open balance on an
 * issued public invoice and returns the hosted Checkout URL to redirect to.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!isDatabaseConfigured() || !isStripeConfigured()) {
    return Response.json({ error: 'Online card payments are not enabled.' }, { status: 503 });
  }

  const { token } = await params;
  const inv = await invoiceByToken(token);
  if (!inv) {
    return Response.json({ error: 'Invoice not found.' }, { status: 404 });
  }

  const openCents = balance(inv.totalCents, inv.paidCents, inv.creditedCents);
  if (!canSettle(inv.status) || openCents <= 0) {
    return Response.json({ error: 'This invoice has no remaining balance.' }, { status: 409 });
  }

  const { successUrl, cancelUrl } = stripeCheckoutReturnUrls(siteOrigin(req), token);
  const metadata = {
    invoiceId: inv.id,
    publicToken: token,
    workspaceId: inv.workspaceId,
    invoiceNumber: inv.number ?? '',
  };

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      client_reference_id: inv.id,
      customer_email: inv.parties?.buyer.email ?? undefined,
      metadata,
      payment_intent_data: { metadata },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: inv.currency.toLowerCase(),
            unit_amount: openCents,
            product_data: {
              name: inv.number ? `Invoice ${inv.number}` : 'REM Assistance Invoice',
              description: inv.parties?.buyer.name ? `Billed to ${inv.parties.buyer.name}` : undefined,
            },
          },
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    if (!session.url) {
      return Response.json({ error: 'Could not start Stripe Checkout.' }, { status: 502 });
    }
    return Response.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] checkout session creation failed', err);
    return Response.json({ error: 'Could not reach Stripe. Please try again.' }, { status: 502 });
  }
}
