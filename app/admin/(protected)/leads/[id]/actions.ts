'use server';

import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/leads/display';
import { logActivity, recordEvent } from '@/lib/crm/events';
import { currentWorkspaceId, scoped } from '@/lib/crm/workspace';

/**
 * Set a lead's status.
 *
 * A server action is a POST endpoint with a generated name — it is NOT covered
 * by the (protected) layout's gate, which only runs when rendering a page. So
 * it re-checks the session itself. Trusting the layout here would leave an
 * unauthenticated write against the leads table.
 */
export async function setLeadStatus(id: string, status: string) {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');

  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('bad id');
  if (!(LEAD_STATUSES as readonly string[]).includes(status)) throw new Error('bad status');

  const db = getDb();
  const workspaceId = currentWorkspaceId();
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select({ status: leads.status })
      .from(leads)
      .where(scoped(leads.workspaceId, workspaceId, eq(leads.id, id)));
    if (!before) throw new Error('not found');
    if (before.status === status) return;

    await tx
      .update(leads)
      .set({
        status: status as LeadStatus,
        updatedAt: new Date(),
        /* The response-time clock stops at the first move out of "new". */
        ...(before.status === 'new' && status !== 'spam' ? { firstContactedAt: sql`coalesce(${leads.firstContactedAt}, now())` } : {}),
      })
      .where(eq(leads.id, id));

    const change = { from: before.status, to: status };
    await recordEvent(tx, { workspaceId, type: 'lead.status_changed', subjectType: 'lead', subjectId: id, actorId: user.id, payload: change });
    await logActivity(tx, { workspaceId, type: 'status_change', leadId: id, actorId: user.id, meta: change });
  });

  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}
