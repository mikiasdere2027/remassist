import { isDatabaseConfigured } from '@/db';
import { cronAuthorised, formatDigest } from '@/lib/crm/automation';
import { digestData } from '@/lib/crm/automationData';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { notifyText } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';

/**
 * The daily CRM digest, posted to the team's Slack channel (LEAD_WEBHOOK_URL):
 * leads waiting over 24 h for a first response, overdue tasks, tasks due
 * today, renewals in the next 30 days.
 *
 * Called by the server's scheduled job (deploy/run-digest.sh), which sends the
 * cron secret in x-cron-secret. Anything else gets a 404. ?dry=1 returns the
 * text without posting it.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!cronAuthorised(req.headers.get('x-cron-secret'))) return new Response('Not found', { status: 404 });
  if (!isDatabaseConfigured()) return Response.json({ ok: false, error: 'database not configured' }, { status: 503 });

  const text = formatDigest(await digestData(currentWorkspaceId(), SITE_URL));
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const configured = Boolean(process.env.LEAD_WEBHOOK_URL);
  if (!dry && text && configured) await notifyText(text);
  return Response.json({ ok: true, posted: Boolean(!dry && text && configured), configured, empty: !text, text });
}
