import { isDatabaseConfigured } from '@/db';
import { currentUser } from '@/lib/auth/require';
import { canExportData } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { rangeFor, rangeStart, toCsv } from '@/lib/crm/reports';
import { isReportKey, reportTable } from '@/lib/crm/reportTables';

/**
 * CSV download of one report, exactly the rows the Reports page shows.
 * Route handlers are not covered by the layout's gate, so this checks the
 * session itself (404, not 403, when signed out).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return new Response('Not found', { status: 404 });
  if (!canExportData(user.role)) return new Response('Forbidden', { status: 403 });
  if (!isDatabaseConfigured()) return new Response('Database not configured', { status: 503 });
  const url = new URL(req.url);
  const key = url.searchParams.get('report') ?? '';
  if (!isReportKey(key)) return new Response('Unknown report', { status: 400 });
  const range = rangeFor(url.searchParams.get('range') ?? undefined);
  const t = await reportTable(key, currentWorkspaceId(), rangeStart(range.key));
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response('﻿' + toCsv(t.header, t.rows), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="rem-assist-${key}-${range.key}-${stamp}.csv"`,
      'cache-control': 'private, no-store',
    },
  });
}
