import { isDatabaseConfigured } from '@/db';
import { cronAuthorised } from '@/lib/crm/automation';
import { monthlyCommissionData } from '@/lib/crm/slaReports';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { notifyText } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import { isoDay } from '@/lib/crm/engagements';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/sla-monthly
 *
 * Run on the 1st–3rd business day of each month. Reconciles the prior month's:
 *   1. REM-agent completed appointments → $10/appointment commission invoice draft
 *   2. Uptime credit if monthly uptime < 98% → credit note draft
 *
 * Reports a Slack summary and returns structured JSON for admin review.
 * Does NOT auto-issue invoices: an admin must approve and issue from /admin/invoices.
 *
 * Also flags appointments still in 'scheduled' status 2+ days after their time
 * so Thorwell can update them (Section 4 reconciliation SLA).
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

  // Default: prior month
  const today = isoDay(new Date());
  const [y, m] = today.split('-').map(Number);
  const priorMonthStart = m === 1
    ? `${y - 1}-12-01`
    : `${y}-${String(m - 1).padStart(2, '0')}-01`;

  const data = await monthlyCommissionData(ws, priorMonthStart);

  const uptimeOk = data.uptimeRemedyCents === 0;
  const creditLine = uptimeOk
    ? '  ✅ No uptime credit applicable (≥ 98% uptime)'
    : `  ⚠️ Uptime credit: -$${(data.uptimeRemedyCents / 100).toFixed(2)} (uptime below 98%)`;

  const text = [
    `💰 *REM Assist Monthly Commission — ${data.periodLabel}*`,
    ``,
    `*Appointment Commission (Exhibit A)*`,
    `  • Eligible completed appointments: ${data.eligibleCount}`,
    `  • Commission @ $10.00 each: $${(data.totalCommissionCents / 100).toFixed(2)}`,
    creditLine,
    `  • Net payable: $${(data.netBillCents / 100).toFixed(2)}`,
    ``,
    `*Action required:*`,
    `  → Review and issue the commission invoice: ${SITE_URL}/admin/invoices`,
    `  → Update any appointments still showing 'Scheduled': ${SITE_URL}/admin`,
    ``,
    `Breakdown includes ${data.items.length} total appointment records.`,
  ].join('\n');

  const thorwellHook = process.env.THORWELL_WEBHOOK_URL?.trim();
  const configured = Boolean(process.env.LEAD_WEBHOOK_URL || thorwellHook);
  if (!dry && configured) {
    if (process.env.LEAD_WEBHOOK_URL) {
      await notifyText(text);
    }
    if (thorwellHook) {
      await fetch(thorwellHook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5_000),
      }).catch(() => {});
    }
  }

  return Response.json({ ok: true, posted: !dry && configured, data, text });
}
