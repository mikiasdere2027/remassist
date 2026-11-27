import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { activities, agentSessions, leads, slaIncidents, users } from '@/db/schema';
import { appointments as apptTable } from '@/db/schema/sla';
import type { WorkspaceId } from './workspace';
import { SLA_LIMIT_SECONDS, type AppointmentChannel, type AppointmentStatus, type ShiftType } from './sla';

/**
 * SLA watchdog data layer — pure database queries for the cron watchdog.
 * No business-hour logic here: that lives in lib/crm/sla.ts (pure + tested).
 */

/** All leads without a first dial within the SLA window, not excluded, still open. */
export async function openSlaBreachLeads(ws: WorkspaceId, limitSec = SLA_LIMIT_SECONDS, now = new Date()) {
  const cutoff = new Date(now.getTime() - limitSec * 1000);
  return getDb()
    .select({ id: leads.id, name: leads.name, email: leads.email, createdAt: leads.createdAt, ownerId: leads.ownerId, slaExclusionReason: leads.slaExclusionReason })
    .from(leads)
    .where(and(
      eq(leads.workspaceId, ws),
      eq(leads.slaExclusionReason, 'none'),
      isNull(leads.firstDialAt),
      lte(leads.createdAt, cutoff),
      sql`${leads.status} not in ('won','lost','spam','unqualified','converted')`,
    ))
    .limit(50);
}

/** Active agent sessions (ended_at is null). Returns count of online agents. */
export async function onlineAgentCount(ws: WorkspaceId, staleSec = 300, now = new Date()) {
  const staleAt = new Date(now.getTime() - staleSec * 1000);
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(agentSessions)
    .where(and(
      eq(agentSessions.workspaceId, ws),
      isNull(agentSessions.endedAt),
      sql`${agentSessions.lastHeartbeatAt} > ${staleAt}`,
    ));
  return row?.n ?? 0;
}

/** True if there's already an open (un-resolved) critical incident today. */
export async function hasOpenCriticalIncident(ws: WorkspaceId, now = new Date()) {
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const [row] = await getDb()
    .select({ id: slaIncidents.id })
    .from(slaIncidents)
    .where(and(
      eq(slaIncidents.workspaceId, ws),
      eq(slaIncidents.severity, 'critical'),
      isNull(slaIncidents.resolvedAt),
      sql`${slaIncidents.detectedAt} > ${dayStart}`,
    ))
    .limit(1);
  return Boolean(row);
}

/** Opens a critical incident record. */
export async function openCriticalIncident(
  ws: WorkspaceId,
  title: string,
  summary: string,
): Promise<string> {
  const [row] = await getDb()
    .insert(slaIncidents)
    .values({ workspaceId: ws, severity: 'critical', title, summary })
    .returning({ id: slaIncidents.id });
  return row.id;
}

/** Appointment status reminder: appointments still 'scheduled' 2+ business days after their time. */
export async function appointmentsNeedingStatusUpdate(ws: WorkspaceId, businessDaysSince = 2, now = new Date()) {
  const twoBusinessDaysMs = businessDaysSince * 24 * 3_600_000 * 1.5; // approx; exact version in cron
  const cutoff = new Date(now.getTime() - twoBusinessDaysMs);
  return getDb()
    .select({ id: apptTable.id, leadId: apptTable.leadId, scheduledAt: apptTable.scheduledAt })
    .from(apptTable)
    .where(and(
      eq(apptTable.workspaceId, ws),
      eq(apptTable.status, 'scheduled'),
      lte(apptTable.scheduledAt, cutoff),
    ))
    .limit(100);
}

/* ── Agent sessions (heartbeat & handoff) ──────────────────────────────────── */

/** Closes any prior open session for `userId` and opens a fresh shift session. */
export async function startAgentSession(
  ws: WorkspaceId,
  userId: string,
  shiftType: ShiftType,
  engagementId?: string | null,
) {
  const db = getDb();
  const now = new Date();
  await db.update(agentSessions)
    .set({ endedAt: now })
    .where(and(eq(agentSessions.workspaceId, ws), eq(agentSessions.userId, userId), isNull(agentSessions.endedAt)));

  const [row] = await db.insert(agentSessions)
    .values({
      workspaceId: ws,
      userId,
      shiftType,
      engagementId: engagementId ?? null,
      startedAt: now,
      lastHeartbeatAt: now,
    })
    .returning({ id: agentSessions.id, startedAt: agentSessions.startedAt, shiftType: agentSessions.shiftType });
  return row;
}

/** Updates `lastHeartbeatAt` on the agent's active session. */
export async function heartbeatAgentSession(ws: WorkspaceId, userId: string, sessionId?: string) {
  const db = getDb();
  const now = new Date();
  const where = [
    eq(agentSessions.workspaceId, ws),
    eq(agentSessions.userId, userId),
    isNull(agentSessions.endedAt),
    ...(sessionId ? [eq(agentSessions.id, sessionId)] : []),
  ];
  const [row] = await db.update(agentSessions)
    .set({ lastHeartbeatAt: now })
    .where(and(...where))
    .returning({ id: agentSessions.id, lastHeartbeatAt: agentSessions.lastHeartbeatAt });
  return row ?? null;
}

/** Ends the agent's active session and stores optional end-of-shift handoff notes. */
export async function endAgentSession(
  ws: WorkspaceId,
  userId: string,
  opts: { sessionId?: string; handoffNotes?: string; appointmentsBooked?: number } = {},
) {
  const db = getDb();
  const now = new Date();
  const where = [
    eq(agentSessions.workspaceId, ws),
    eq(agentSessions.userId, userId),
    isNull(agentSessions.endedAt),
    ...(opts.sessionId ? [eq(agentSessions.id, opts.sessionId)] : []),
  ];
  const [row] = await db.update(agentSessions)
    .set({
      endedAt: now,
      ...(opts.handoffNotes !== undefined ? { handoffNotes: opts.handoffNotes } : {}),
      ...(opts.appointmentsBooked !== undefined ? { appointmentsBooked: opts.appointmentsBooked } : {}),
    })
    .where(and(...where))
    .returning({ id: agentSessions.id, endedAt: agentSessions.endedAt });
  return row ?? null;
}

export interface OnlineAgent {
  sessionId: string;
  userId: string;
  name: string | null;
  email: string;
  shiftType: ShiftType;
  startedAt: Date;
  lastHeartbeatAt: Date;
}

/**
 * Active agents with a recent heartbeat (default 5 min).
 * Returns [] if the 0022_crm_sla migration has not been applied yet.
 */
export async function listOnlineAgents(ws: WorkspaceId, staleSec = 300, now = new Date()): Promise<OnlineAgent[]> {
  try {
    const staleAt = new Date(now.getTime() - staleSec * 1000);
    return await getDb()
      .select({
        sessionId: agentSessions.id,
        userId: agentSessions.userId,
        name: users.name,
        email: users.email,
        shiftType: agentSessions.shiftType,
        startedAt: agentSessions.startedAt,
        lastHeartbeatAt: agentSessions.lastHeartbeatAt,
      })
      .from(agentSessions)
      .innerJoin(users, eq(users.id, agentSessions.userId))
      .where(and(
        eq(agentSessions.workspaceId, ws),
        isNull(agentSessions.endedAt),
        sql`${agentSessions.lastHeartbeatAt} > ${staleAt}`,
      ))
      .orderBy(desc(agentSessions.lastHeartbeatAt))
      .limit(20);
    } catch {
    return [];
  }
}

/* ── Mandatory disposition & FIFO next-lead gate ───────────────────────────── */

/**
 * Checks whether the agent's most recent outbound call activity is missing
 * a disposition code or structured notes (Section 2 & 7.4).
 */
export async function findUndispositionedCall(ws: WorkspaceId, userId: string) {
  const [lastCall] = await getDb()
    .select({ id: activities.id, leadId: activities.leadId, body: activities.body, meta: activities.meta })
    .from(activities)
    .where(and(eq(activities.workspaceId, ws), eq(activities.actorId, userId), eq(activities.type, 'call')))
    .orderBy(desc(activities.occurredAt))
    .limit(1);
  if (!lastCall) return null;
  const meta = lastCall.meta as Record<string, unknown> | null;
  const hasDisposition = Boolean(meta?.dispositionCode || meta?.outcome);
  const hasNotes = Boolean(lastCall.body?.trim());
  if (hasDisposition && hasNotes) return null;
  return lastCall;
}

/** Returns the oldest non-DNC, uncalled lead in FIFO order (Section 7.3). */
export async function nextFifoLead(ws: WorkspaceId) {
  const [lead] = await getDb()
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      createdAt: leads.createdAt,
      slaExclusionReason: leads.slaExclusionReason,
    })
    .from(leads)
    .where(and(
      eq(leads.workspaceId, ws),
      eq(leads.dncFlag, false),
      isNull(leads.firstDialAt),
      sql`${leads.status} not in ('won','lost','spam','unqualified','converted')`,
    ))
    .orderBy(asc(leads.createdAt))
    .limit(1);
  return lead ?? null;
}

/* ── Appointments & SLA Incidents (Admin UI) ───────────────────────────────── */

export interface AppointmentListRow {
  id: string;
  leadId: string;
  leadName: string | null;
  leadEmail: string;
  bookedByChannel: AppointmentChannel;
  bookedByName: string | null;
  status: AppointmentStatus;
  scheduledAt: Date;
  completedAt: Date | null;
  statusUpdatedAt: Date | null;
}

export async function listAppointments(ws: WorkspaceId, statusFilter?: AppointmentStatus): Promise<AppointmentListRow[]> {
  try {
    const where = [eq(apptTable.workspaceId, ws), ...(statusFilter ? [eq(apptTable.status, statusFilter)] : [])];
    return await getDb()
      .select({
        id: apptTable.id,
        leadId: apptTable.leadId,
        leadName: leads.name,
        leadEmail: leads.email,
        bookedByChannel: apptTable.bookedByChannel,
        bookedByName: users.name,
        status: apptTable.status,
        scheduledAt: apptTable.scheduledAt,
        completedAt: apptTable.completedAt,
        statusUpdatedAt: apptTable.statusUpdatedAt,
      })
      .from(apptTable)
      .innerJoin(leads, eq(leads.id, apptTable.leadId))
      .leftJoin(users, eq(users.id, apptTable.bookedByUserId))
      .where(and(...where))
      .orderBy(desc(apptTable.scheduledAt))
      .limit(200);
  } catch {
    return [];
  }
}

export async function updateAppointmentStatus(ws: WorkspaceId, id: string, status: AppointmentStatus) {
  const now = new Date();
  const [row] = await getDb()
    .update(apptTable)
    .set({
      status,
      statusUpdatedAt: now,
      completedAt: status === 'completed' ? now : null,
      updatedAt: now,
    })
    .where(and(eq(apptTable.workspaceId, ws), eq(apptTable.id, id)))
    .returning({ id: apptTable.id });
  return row ?? null;
}

export async function listSlaIncidents(ws: WorkspaceId) {
  try {
    return await getDb()
      .select()
      .from(slaIncidents)
      .where(eq(slaIncidents.workspaceId, ws))
      .orderBy(desc(slaIncidents.detectedAt))
      .limit(100);
  } catch {
    return [];
  }
}

export async function acknowledgeSlaIncident(ws: WorkspaceId, id: string) {
  const [row] = await getDb()
    .update(slaIncidents)
    .set({ acknowledgedAt: new Date() })
    .where(and(eq(slaIncidents.workspaceId, ws), eq(slaIncidents.id, id), isNull(slaIncidents.acknowledgedAt)))
    .returning({ id: slaIncidents.id });
  return row ?? null;
}

export async function resolveSlaIncident(
  ws: WorkspaceId,
  id: string,
  opts: { rootCause?: string; correctiveAction?: string },
) {
  const now = new Date();
  const [row] = await getDb()
    .update(slaIncidents)
    .set({
      resolvedAt: now,
      acknowledgedAt: sql`coalesce(${slaIncidents.acknowledgedAt}, ${now})`,
      ...(opts.rootCause ? { rootCause: opts.rootCause } : {}),
      ...(opts.correctiveAction ? { correctiveAction: opts.correctiveAction } : {}),
    })
    .where(and(eq(slaIncidents.workspaceId, ws), eq(slaIncidents.id, id)))
    .returning({ id: slaIncidents.id });
  return row ?? null;
}
