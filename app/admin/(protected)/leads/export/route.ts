import { and, desc } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads } from '@/db/schema';
import { auth } from '@/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';
import { csvRow, formatDate } from '@/lib/leads/display';
import { buildLeadFilters, type LeadSearch } from '@/lib/leads/query';

/**
 * CSV export — MIGRATION-PLAN §10.
 *
 * Two things this must get right.
 *
 * 1. It re-checks the session. A route handler renders outside the layout tree,
 *    so the (protected) gate never runs for it. Without this check the whole
 *    lead table is a public URL.
 * 2. It escapes properly. Lead messages contain commas, quotes and hard
 *    newlines as a matter of course, and one unescaped cell silently shifts
 *    every later column in that row. See csvCell in lib/leads/display.ts.
 */
export const dynamic = 'force-dynamic';

/** Every column, because the point of the export is to lose nothing. */
const HEADERS = [
  'id', 'created_at', 'status', 'source',
  'first_name', 'last_name', 'name', 'email', 'phone', 'company',
  'country', 'service_interest', 'message', 'consent_at',
  'page_url', 'referrer', 'utm', 'raw_fields',
];

export async function GET(req: Request) {
  const session = await auth();
  if (!isAllowedEmail(session?.user?.email)) {
    /* 404, not 403: an authenticated-only URL that answers 403 confirms it
       exists and is worth attacking. */
    return new Response('Not found', { status: 404 });
  }

  if (!isDatabaseConfigured()) {
    return new Response('Database not configured', { status: 503 });
  }

  const url = new URL(req.url);
  const sp: LeadSearch = {
    source: url.searchParams.get('source') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
  };
  const where = buildLeadFilters(sp);

  const db = getDb();
  const rows = await db
    .select()
    .from(leads)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(leads.createdAt));

  const body = [
    csvRow(HEADERS),
    ...rows.map((r) => csvRow([
      r.id,
      formatDate(r.createdAt),
      r.status,
      r.source,
      r.firstName,
      r.lastName,
      r.name,
      r.email,
      r.phone,
      r.company,
      r.country,
      r.serviceInterest,
      r.message,
      formatDate(r.consentAt),
      r.pageUrl,
      r.referrer,
      r.utm,
      r.rawFields,
    ])),
  ].join('\r\n');

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(
    /* Excel reads a bare UTF-8 CSV as the system codepage and mangles any
       non-ASCII name or company. The BOM is what makes it read UTF-8. */
    `﻿${body}`,
    {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="rem-leads-${stamp}.csv"`,
        /* Contains every lead in the database. Nothing may cache it. */
        'cache-control': 'no-store, private',
      },
    },
  );
}
