'use server';

import { revalidatePath } from 'next/cache';
import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { acknowledgeSlaIncident, resolveSlaIncident } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

const UUID = /^[0-9a-f-]{36}$/i;

export async function acknowledgeIncidentAction(fd: FormData) {
  const user = await assertUser();
  if (!canEditLeads(user.role) || !isDatabaseConfigured()) return;
  const id = String(fd.get('id') ?? '');
  if (!UUID.test(id)) return;
  await acknowledgeSlaIncident(currentWorkspaceId(), id);
  revalidatePath('/admin/sla-incidents');
}

export async function resolveIncidentAction(fd: FormData) {
  const user = await assertUser();
  if (!canEditLeads(user.role) || !isDatabaseConfigured()) return;
  const id = String(fd.get('id') ?? '');
  if (!UUID.test(id)) return;
  const rootCause = String(fd.get('rootCause') ?? '').trim() || undefined;
  const correctiveAction = String(fd.get('correctiveAction') ?? '').trim() || undefined;
  await resolveSlaIncident(currentWorkspaceId(), id, { rootCause, correctiveAction });
  revalidatePath('/admin/sla-incidents');
}
