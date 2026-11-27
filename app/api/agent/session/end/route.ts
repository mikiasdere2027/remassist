import { z } from 'zod';
import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { endAgentSession } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

export const dynamic = 'force-dynamic';

const Body = z.object({
  sessionId: z.string().uuid().optional(),
  handoffNotes: z.string().trim().max(5000).optional(),
  appointmentsBooked: z.number().int().min(0).max(500).optional(),
}).default({});

/** POST /api/agent/session/end — closes the active shift session and records handoff notes. */
export async function POST(req: Request) {
  let user;
  try {
    user = await assertUser();
  } catch {
    return Response.json({ ok: false, error: 'unauthorised' }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: 'unavailable' }, { status: 503 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const session = await endAgentSession(currentWorkspaceId(), user.id, parsed.data);
  if (!session) {
    return Response.json({ ok: false, error: 'no_active_session' }, { status: 404 });
  }
  return Response.json({ ok: true, session });
}
