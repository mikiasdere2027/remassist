import { NextResponse } from 'next/server';
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { popups } from '@/db/schema';

/**
 * The popups a page may show, as JSON.
 *
 * The public renderer (components/popups/PopupManager.tsx) fetches this on
 * mount. Serving the popups through an endpoint rather than rendering them
 * into the page keeps the marketing pages prerendered — a static page does not
 * become dynamic just because it might show an ad — and leaves the
 * placement decision to the visitor's own pathname, so a placement matches
 * whatever URL they actually landed on.
 *
 * Only popups that are both published and currently inside their schedule
 * window come back. A published popup with a future start is a scheduled one;
 * an ended run is no longer live even if nobody has suspended it. Drafts
 * never leave the database.
 *
 * No store: the response is deliberately not cached, because the "current
 * window" is the point of the query and a shared proxy holding a stale run
 * past its ends_at is exactly the failure this file is here to prevent.
 */

/* Route handlers that return Response are cached by default in Next; a cached
   copy of "what is live right now" would keep serving an ended campaign. The
   no-store header opts out, but this makes the intent explicit — the query
   runs fresh on every request. */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ popups: [] }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const now = new Date();
  const db = getDb();
  const rows = await db
    .select({
      id: popups.id,
      title: popups.title,
      message: popups.message,
      image: popups.image,
      ctaLabel: popups.ctaLabel,
      ctaHref: popups.ctaHref,
      campaign: popups.campaign,
      trackingKey: popups.trackingKey,
      placement: popups.placement,
      template: popups.template,
      delaySeconds: popups.delaySeconds,
      displaySeconds: popups.displaySeconds,
    })
    .from(popups)
    .where(
      and(
        eq(popups.published, true),
        and(
          or(isNull(popups.startsAt), lte(popups.startsAt, now)),
          or(isNull(popups.endsAt), gte(popups.endsAt, now)),
        ),
      ),
    )
    /* Newest first: when an editor raises a new campaign while an old one is
       still running, the new push is the one worth surfacing first. */
    .orderBy(desc(popups.createdAt));

  return NextResponse.json({ popups: rows }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}