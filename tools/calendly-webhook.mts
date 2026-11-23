/**
 * Register the Calendly webhook that sends bookings to the CRM. Run once:
 *
 *   CALENDLY_TOKEN=... npx tsx tools/calendly-webhook.mts https://remassistance.com/api/webhooks/calendly
 *
 * Needs a Calendly personal access token with the webhooks:write scope, from
 * an account on a plan that includes webhooks (Standard or above), and the
 * organization's owner/admin rights for an organization-wide subscription.
 *
 * It generates a signing key, creates the subscription for invitee.created and
 * invitee.canceled, and prints the line to add to /srv/remassist/shared/.env:
 *   CALENDLY_WEBHOOK_SIGNING_KEY=...
 * Until that line is there and the app restarted, the webhook answers 404.
 */
import { randomBytes } from 'node:crypto';

const token = process.env.CALENDLY_TOKEN;
const url = process.argv[2];
if (!token || !url || !/^https:\/\//.test(url)) {
  console.error('Usage: CALENDLY_TOKEN=... npx tsx tools/calendly-webhook.mts https://<site>/api/webhooks/calendly');
  process.exit(1);
}
const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(`https://api.calendly.com${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body)}`);
  return body as Record<string, any>;
};

const me = await api('/users/me');
const organization = me.resource.current_organization as string;
const signingKey = randomBytes(32).toString('hex');
const created = await api('/webhook_subscriptions', {
  method: 'POST',
  body: JSON.stringify({ url, events: ['invitee.created', 'invitee.canceled'], organization, scope: 'organization', signing_key: signingKey }),
});
console.log(`Subscribed: ${created.resource?.uri ?? '(no uri returned)'}`);
console.log('\nAdd this line to /srv/remassist/shared/.env, then restart the app:\n');
console.log(`CALENDLY_WEBHOOK_SIGNING_KEY=${signingKey}`);
