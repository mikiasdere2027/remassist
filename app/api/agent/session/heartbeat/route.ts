import { z } from 'zod';
import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { heartbeatAgentSession } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

export const dynamic = 'force-dynamic';

const Body = z.object({
  sessionId: z.string().uuid().optional(),
}).default({});

/** POST /api/agent/session/heartbeat — bumps lastHeartbeatAt on the agent's active shift session. */
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

  const session = await heartbeatAgentSession(currentWorkspaceId(), user.id, parsed.data.sessionId);
  if (!session) {
    return Response.json({ ok: false, error: 'no_active_session' }, { status: 404 });
  }
  return Response.json({ ok: true, session });
}
