import { isDatabaseConfigured } from '@/db';
import { cronAuthorised } from '@/lib/crm/automation';
import { isWithinSlaCoverage, SLA_LIMIT_SECONDS } from '@/lib/crm/sla';
import { openSlaBreachLeads, onlineAgentCount, hasOpenCriticalIncident, openCriticalIncident } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { notifyText } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/sla-watchdog
 *
 * Runs every 5 minutes (via cron job or systemd timer). Checks:
 *
 * 1. Speed-to-Lead: any non-excluded lead waiting > 3 minutes without a first
 *    dial during the 9am–9pm ET SLA window → notify CSM.
 * 2. 15-minute coverage gap: if zero agents have an active heartbeat for
 *    > 15 minutes during coverage hours → open a Critical Incident + notify.
 *
 * Returns a JSON summary for cron log inspection. Protected by x-cron-secret.
 */
export async function POST(req: Request) {
  if (!cronAuthorised(req.headers.get('x-cron-secret'))) {
    return new Response('Not found', { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'database not configured' }, { status: 503 });
  }

  const now = new Date();
  const ws = currentWorkspaceId();
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const withinWindow = isWithinSlaCoverage(now);

  const result: {
    checkedAt: string;
    withinCoverageWindow: boolean;
    slaBreaches: string[];
    coverageGap: boolean;
    incidentOpened: boolean;
    appointmentReminders: number;
    notifications: string[];
  } = {
    checkedAt: now.toISOString(),
    withinCoverageWindow: withinWindow,
    slaBreaches: [],
    coverageGap: false,
    incidentOpened: false,
    appointmentReminders: 0,
    notifications: [],
  };

  if (withinWindow) {
    // ── 1. Speed-to-Lead: flag leads > SLA_LIMIT_SECONDS with no first dial ──
    const breached = await openSlaBreachLeads(ws, SLA_LIMIT_SECONDS, now);
    for (const lead of breached) {
      const waitSec = Math.round((now.getTime() - lead.createdAt.getTime()) / 1000);
      const msg = `🚨 *SLA Breach* — Lead "${lead.name || lead.email}" has not been called after ${Math.round(waitSec / 60)} min (${waitSec}s). ${SITE_URL}/admin/leads/${lead.id}`;
      result.slaBreaches.push(lead.id);
      if (!dry) await notifyText(msg);
      result.notifications.push(msg);
    }

    // ── 2. 15-minute coverage gap: zero agents with heartbeat in last 15 min ─
    const GAP_THRESHOLD_SEC = 15 * 60;
    const online = await onlineAgentCount(ws, GAP_THRESHOLD_SEC, now);
    if (online === 0) {
      result.coverageGap = true;
      const alreadyOpen = await hasOpenCriticalIncident(ws, now);
      if (!alreadyOpen) {
        const title = 'Critical: No REM agent online';
        const summary = `No agent heartbeat detected during SLA coverage hours (9am–9pm ET) for > 15 minutes. Detected at ${now.toISOString()}.`;
        if (!dry) {
          await openCriticalIncident(ws, title, summary);
        }
        const msg = `🚨 *CRITICAL* — ${title}. ${summary} Acknowledge in admin: ${SITE_URL}/admin`;
        if (!dry) await notifyText(msg);
        result.notifications.push(msg);
        result.incidentOpened = !dry;
      }
    }
  }

  return Response.json({ ok: true, ...result });
}
