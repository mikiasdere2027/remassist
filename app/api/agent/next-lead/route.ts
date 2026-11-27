import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { findUndispositionedCall, nextFifoLead } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agent/next-lead
 *
 * Enforces Section 2 & 7.4 ("100% of contacts dispositioned with notes before
 * the agent takes the next lead"). Returns 409 if the agent's last call lacks
 * a disposition or notes; otherwise returns the oldest non-DNC lead FIFO.
 */
export async function POST() {
  let user;
  try {
    user = await assertUser();
  } catch {
    return Response.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }

  const ws = currentWorkspaceId();
  const pending = await findUndispositionedCall(ws, user.id);
  if (pending) {
    return Response.json(
      {
        ok: false,
        error: 'disposition_required',
        message: 'Log a disposition and call notes on your previous call before taking the next lead.',
        leadId: pending.leadId,
      },
      { status: 409 },
    );
  }

  const lead = await nextFifoLead(ws);
  return Response.json({ ok: true, lead });
}
