'use client';

import { useState } from 'react';
import s from '../../p/[token]/page.module.css';

interface Props {
  token: string;
  amountLabel: string;
}

/**
 * Starts a Stripe Checkout Session for the invoice's remaining balance and
 * redirects the client to Stripe's hosted payment page.
 */
export default function PayWithStripeButton({ token, amountLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${encodeURIComponent(token)}/checkout`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Could not start card checkout.');
        setBusy(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError('Network error — please try again.');
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <button type="button" className={s.primary} disabled={busy} onClick={startCheckout}>
        {busy ? 'Redirecting to Stripe…' : `Pay ${amountLabel} with card`}
      </button>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
    </div>
  );
}
