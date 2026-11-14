'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb, isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { TeamLeadInput, createTeamLead, existingByEmail } from '@/lib/crm/intake';
import { getTeam } from '@/lib/crm/leads';

export type NewLeadState = { error: string; duplicateId?: string } | null;

/**
 * Create a lead by hand. Re-checks the session (a server action is not covered
 * by the layout's gate), refuses a duplicate email with a link to the existing
 * lead, and opens the new lead on success.
 */
export async function createLead(_prev: NewLeadState, fd: FormData): Promise<NewLeadState> {
  const user = await assertUser();
  if (!canEditLeads(user.role)) return { error: 'You do not have permission to add leads.' };
  if (!isDatabaseConfigured()) return { error: 'The database is not configured.' };

  const parsed = TeamLeadInput.safeParse({
    firstName: fd.get('firstName') ?? undefined,
    lastName: fd.get('lastName') ?? undefined,
    email: fd.get('email') ?? '',
    phone: fd.get('phone') ?? undefined,
    company: fd.get('company') ?? undefined,
    country: fd.get('country') ?? undefined,
    serviceInterest: fd.get('serviceInterest') ?? undefined,
    message: fd.get('message') ?? undefined,
    source: fd.get('source') || undefined,
    ownerId: fd.get('ownerId') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!parsed.data.firstName && !parsed.data.lastName && !parsed.data.company) {
    return { error: 'Give a name or a company, so the lead can be recognised in the list.' };
  }
  if (parsed.data.ownerId && !(await getTeam()).some((m) => m.id === parsed.data.ownerId)) {
    return { error: 'That owner no longer has access. Pick someone else.' };
  }

  const ws = currentWorkspaceId();
  const result = await getDb().transaction(async (tx) => {
    const dup = await existingByEmail(tx, ws, [parsed.data.email]);
    const existing = dup.get(parsed.data.email);
    if (existing) return { duplicateId: existing } as const;
    return { id: await createTeamLead(tx, ws, parsed.data, user.id) } as const;
  });

  if ('duplicateId' in result) {
    return { error: 'A lead with this email already exists.', duplicateId: result.duplicateId };
  }
  revalidatePath('/admin/leads');
  redirect(`/admin/leads/${result.id}`);
}
