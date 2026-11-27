import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { agentSessions, appointments as apptTable, leads } from '@/db/schema';
import type { WorkspaceId } from './workspace';
import { reconcileCommissionAppointments, calculateUptimeRemedy, type CommissionCandidate } from './sla';
import { monthPeriod } from './invoices';

/**
 * Weekly performance summary and monthly SLA reconciliation data.
 * Pure database queries — formatting lives in slaReports.ts.
 */

export interface WeeklySlaStats {
  periodLabel: string;
  totalLeads: number;
  eligibleLeads: number;
  calledWithin3min: number;
  compliancePct: number;
  avgElapsedSec: number | null;
  appointmentsBooked: number;
  connectedMinutes: number;
  scheduledMinutes: number;
  uptimePct: number;
}

export async function weeklyStats(ws: WorkspaceId, weekStart: string, weekEnd: string): Promise<WeeklySlaStats> {
  const db = getDb();
  const from = new Date(`${weekStart}T00:00:00Z`);
  const to = new Date(`${weekEnd}T23:59:59Z`);

  const [leadsResult, apptResult, sessionResult] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      eligible: sql<number>`count(*) filter (where ${leads.slaExclusionReason} = 'none')::int`,
      calledIn3min: sql<number>`count(*) filter (where ${leads.slaExclusionReason} = 'none' and ${leads.firstDialAt} is not null and extract(epoch from (${leads.firstDialAt} - ${leads.createdAt})) <= 180)::int`,
      avgSec: sql<number | null>`round(avg(extract(epoch from (${leads.firstDialAt} - ${leads.createdAt}))) filter (where ${leads.slaExclusionReason} = 'none' and ${leads.firstDialAt} is not null))::int`,
    })
      .from(leads)
      .where(and(eq(leads.workspaceId, ws), gte(leads.createdAt, from), lte(leads.createdAt, to))),

    db.select({ n: sql<number>`count(*)::int` })
      .from(apptTable)
      .where(and(eq(apptTable.workspaceId, ws), gte(apptTable.scheduledAt, from), lte(apptTable.scheduledAt, to))),

    db.select({
      connected: sql<number>`coalesce(sum(extract(epoch from (coalesce(${agentSessions.endedAt}, now()) - ${agentSessions.startedAt})) / 60), 0)::int`,
    })
      .from(agentSessions)
      .where(and(eq(agentSessions.workspaceId, ws), gte(agentSessions.startedAt, from), lte(agentSessions.startedAt, to))),
  ]);

  const stat = leadsResult[0];
  const eligible = stat?.eligible ?? 0;
  const called = stat?.calledIn3min ?? 0;
  // 84 hours/week scheduled (9am-9pm ET, 7 days)
  const scheduledMinutes = 84 * 60;
  const connected = sessionResult[0]?.connected ?? 0;
  const uptimePct = scheduledMinutes > 0 ? Math.round((Math.min(connected, scheduledMinutes) / scheduledMinutes) * 10000) / 100 : 100;

  return {
    periodLabel: `${weekStart} – ${weekEnd}`,
    totalLeads: stat?.total ?? 0,
    eligibleLeads: eligible,
    calledWithin3min: called,
    compliancePct: eligible > 0 ? Math.round((called / eligible) * 10000) / 100 : 100,
    avgElapsedSec: stat?.avgSec ?? null,
    appointmentsBooked: apptResult[0]?.n ?? 0,
    connectedMinutes: connected,
    scheduledMinutes,
    uptimePct,
  };
}

export interface MonthlyCommissionResult {
  periodLabel: string;
  periodStart: string;
  eligibleCount: number;
  totalCommissionCents: number;
  uptimeRemedyCents: number;
  netBillCents: number;
  items: Awaited<ReturnType<typeof reconcileCommissionAppointments>>['items'];
}

export async function monthlyCommissionData(ws: WorkspaceId, periodStart: string): Promise<MonthlyCommissionResult> {
  const db = getDb();
  const { start, end, label } = monthPeriod(periodStart);
  const from = new Date(`${start}T00:00:00Z`);
  const to = new Date(`${end}T23:59:59Z`);

  const [rows, sessionResult] = await Promise.all([
    db.select({
      id: apptTable.id,
      leadId: apptTable.leadId,
      bookedByChannel: apptTable.bookedByChannel,
      status: apptTable.status,
      scheduledAt: apptTable.scheduledAt,
      completedAt: apptTable.completedAt,
    })
      .from(apptTable)
      .where(and(eq(apptTable.workspaceId, ws), gte(apptTable.scheduledAt, from), lte(apptTable.scheduledAt, to))),

    db.select({
      connected: sql<number>`coalesce(sum(extract(epoch from (coalesce(${agentSessions.endedAt}, now()) - ${agentSessions.startedAt})) / 60), 0)::int`,
    })
      .from(agentSessions)
      .where(and(eq(agentSessions.workspaceId, ws), gte(agentSessions.startedAt, from), lte(agentSessions.startedAt, to))),
  ]);

  const candidates = rows as CommissionCandidate[];
  const reconciled = reconcileCommissionAppointments(candidates);

  // Monthly scheduled minutes = 84 hrs/wk * ~4.33 wks
  const scheduledMinutes = Math.round(84 * 60 * 4.33);
  const connectedMinutes = sessionResult[0]?.connected ?? 0;

  // Base fee cents ($690 = $695 - $5 card surcharge ignored here, use gross)
  const baseFeeCents = 69500;
  const remedy = calculateUptimeRemedy({ connectedMinutes, scheduledMinutes, baseFeeCents });

  return {
    periodLabel: label,
    periodStart: start,
    eligibleCount: reconciled.eligibleCount,
    totalCommissionCents: reconciled.totalCommissionCents,
    uptimeRemedyCents: remedy.creditCents,
    netBillCents: reconciled.totalCommissionCents - remedy.creditCents,
    items: reconciled.items,
  };
}
