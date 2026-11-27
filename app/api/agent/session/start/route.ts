import { z } from 'zod';
import { isDatabaseConfigured } from '@/db';
import { assertUser } from '@/lib/auth/require';
import { SHIFT_TYPES } from '@/lib/crm/sla';
import { startAgentSession } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';

export const dynamic = 'force-dynamic';

const Body = z.object({
  shiftType: z.enum(SHIFT_TYPES),
  engagementId: z.string().uuid().optional(),
});

/** POST /api/agent/session/start — opens an agent shift session for uptime & watchdog tracking. */
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

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const session = await startAgentSession(
    currentWorkspaceId(),
    user.id,
    parsed.data.shiftType,
    parsed.data.engagementId,
  );
  return Response.json({ ok: true, session });
}
