import { and, eq, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { attachments } from '@/db/schema';
import { currentUser } from '@/lib/auth/require';
import { canViewLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { readPrivateFile } from '@/lib/crm/files';

/**
 * Downloads a private CRM file (a contract). The only way these files leave
 * the server: they live outside the public uploads folder (lib/crm/files.ts).
 * A route handler is not covered by the (protected) layout's gate, so it
 * checks the session itself, and answers 404 rather than 403 so the URL gives
 * nothing away.
 */
export const dynamic = 'force-dynamic';

const NOT_FOUND = () => new Response('Not found', { status: 404 });
const INLINE = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user || !canViewLeads(user.role) || !isDatabaseConfigured()) return NOT_FOUND();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NOT_FOUND();

  const [f] = await getDb().select().from(attachments)
    .where(and(eq(attachments.workspaceId, currentWorkspaceId()), eq(attachments.id, id), isNull(attachments.archivedAt))).limit(1);
  if (!f) return NOT_FOUND();

  let body: Buffer;
  try {
    body = await readPrivateFile(f.storageKey);
  } catch {
    return NOT_FOUND();
  }
  const disposition = INLINE.has(f.mime) ? 'inline' : 'attachment';
  return new Response(new Uint8Array(body), {
    headers: {
      'content-type': f.mime,
      'content-length': String(body.length),
      'content-disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      /* A PDF opened inline must not run scripts or load anything. */
      'content-security-policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
