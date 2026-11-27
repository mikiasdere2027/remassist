'use server';

import { revalidatePath } from 'next/cache';
import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { APPOINTMENT_STATUSES, type AppointmentStatus } from '@/lib/crm/sla';
import { updateAppointmentStatus } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

const UUID = /^[0-9a-f-]{36}$/i;

export async function changeAppointmentStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const user = await assertUser();
  if (!canEditLeads(user.role)) return { ok: false, error: 'Forbidden' };
  if (!isDatabaseConfigured()) return { ok: false, error: 'Database unavailable' };
  if (!UUID.test(id)) return { ok: false, error: 'Invalid appointment ID' };
  if (!(APPOINTMENT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'Invalid status' };

  const updated = await updateAppointmentStatus(currentWorkspaceId(), id, status as AppointmentStatus);
  if (!updated) return { ok: false, error: 'Appointment not found' };
  revalidatePath('/admin/appointments');
  return { ok: true };
}
