import { isDatabaseConfigured } from '@/db';
import { cronAuthorised } from '@/lib/crm/automation';
import { weeklyStats } from '@/lib/crm/slaReports';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { notifyText } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import { addDays } from '@/lib/crm/invoices';
import { isoDay } from '@/lib/crm/engagements';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/sla-weekly
 *
 * Sends the weekly Thorwell performance summary (Mondays at 11:30 AM ET for the
 * 12:00 PM ET SLA deadline) to the team webhook (LEAD_WEBHOOK_URL) + optionally
 * THORWELL_WEBHOOK_URL if set.
 *
 * Reports:
 *   - Total leads received, SLA-eligible vs. excluded
 *   - % called ≤ 3 minutes (excluding tagged exclusions)
 *   - Average speed-to-lead for eligible calls
 *   - Appointments booked
 *   - Connected hours vs. 84 hrs/week scheduled
 *   - Uptime %
 */
export async function POST(req: Request) {
  if (!cronAuthorised(req.headers.get('x-cron-secret'))) {
    return new Response('Not found', { status: 404 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'database not configured' }, { status: 503 });
  }

  const ws = currentWorkspaceId();
  const dry = new URL(req.url).searchParams.get('dry') === '1';
  const today = isoDay(new Date());
  // Week = Mon–Sun ending yesterday (run on Monday → report prior Mon–Sun)
  const weekEnd = addDays(today, -1);
  const weekStart = addDays(weekEnd, -6);

  const stats = await weeklyStats(ws, weekStart, weekEnd);

  const avg = stats.avgElapsedSec != null
    ? `${stats.avgElapsedSec}s (${Math.round(stats.avgElapsedSec / 60 * 10) / 10} min)`
    : 'N/A';
  const hours = (stats.connectedMinutes / 60).toFixed(1);
  const uptimeColor = stats.uptimePct >= 98 ? '✅' : stats.uptimePct >= 95 ? '⚠️' : '🚨';

  const text = [
    `📊 *REM Assist Weekly Performance — ${stats.periodLabel}*`,
    ``,
    `*Lead Funnel*`,
    `  • Total leads received: ${stats.totalLeads}`,
    `  • SLA-eligible (in-hours, valid phone, within burst limit): ${stats.eligibleLeads}`,
    `  • Excluded (after-hours / invalid phone / burst): ${stats.totalLeads - stats.eligibleLeads}`,
    ``,
    `*Speed-to-Lead (SLA: ≤ 3 min)*`,
    `  • Called ≤ 3 min: ${stats.calledWithin3min} / ${stats.eligibleLeads} (${stats.compliancePct}%)`,
    `  • Average elapsed: ${avg}`,
    ``,
    `*Appointments*`,
    `  • Booked this week: ${stats.appointmentsBooked}`,
    ``,
    `*Coverage & Uptime*`,
    `  • Connected: ${hours} hrs / 84 hrs scheduled`,
    `  ${uptimeColor} Uptime: ${stats.uptimePct}% ${stats.uptimePct < 98 ? '(below 98% threshold)' : ''}`,
    ``,
    `Admin dashboard: ${SITE_URL}/admin`,
  ].join('\n');

  const thorwellHook = process.env.THORWELL_WEBHOOK_URL?.trim();
  const configured = Boolean(process.env.LEAD_WEBHOOK_URL || thorwellHook);
  if (!dry && configured) {
    if (process.env.LEAD_WEBHOOK_URL) {
      await notifyText(text);
    }
    // Also fire to Thorwell's webhook if separately configured
    if (thorwellHook) {
      await fetch(thorwellHook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, posted: !dry && configured, stats, text });
}
