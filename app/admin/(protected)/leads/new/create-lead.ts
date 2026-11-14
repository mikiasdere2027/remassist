import { leadsApi } from '@/lib/api/leads';
import { ApiError } from '@/lib/api/errors';

/**
 * Add a lead by hand (POST /v1/admin/leads). The backend scores it, starts
 * its timeline and refuses a duplicate email — returning the existing lead's
 * id, which the form links to. On success the browser opens the new lead.
 */
export type NewLeadState = { error: string; duplicateId?: string } | null;

export async function createLead(_prev: NewLeadState, fd: FormData): Promise<NewLeadState> {
  const text = (k: string) => String(fd.get(k) ?? '').trim() || undefined;
  try {
    const { id } = await leadsApi.create({
      firstName: text('firstName'),
      lastName: text('lastName'),
      email: text('email') ?? '',
      phone: text('phone'),
      company: text('company'),
      country: text('country'),
      serviceInterest: text('serviceInterest'),
      message: text('message'),
      source: text('source') ?? 'manual',
      ownerId: text('ownerId'),
    });
    window.location.assign(`/admin/leads/${id}`);
    return null;
  } catch (err) {
    if (err instanceof ApiError) {
      const dup = (err.body as { duplicateId?: string } | null)?.duplicateId;
      const field = err.issues[0]?.message;
      return { error: field ?? err.message, ...(dup ? { duplicateId: dup } : {}) };
    }
    return { error: 'Could not add the lead. Try again.' };
  }
}
