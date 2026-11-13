import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { TAGS, type Tag } from '@/lib/api/public';

/**
 * On-demand revalidation, called by the backend after content changes:
 *
 *   POST /api/revalidate   x-revalidate-secret: <REVALIDATE_SECRET>
 *   { "tags": ["faq", "posts"] }
 *
 * The secret is shared with the backend's REVALIDATE_SECRET. Without it set
 * here, the route refuses everything (pages then refresh on the hourly
 * backstop in lib/api/public.ts).
 */
const KNOWN = new Set<string>(Object.values(TAGS));

function secretMatches(given: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-revalidate-secret'))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let tags: unknown;
  try {
    ({ tags } = (await req.json()) as { tags?: unknown });
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((t) => KNOWN.has(String(t)))) {
    return NextResponse.json({ ok: false, message: 'Unknown tags' }, { status: 400 });
  }
  for (const tag of new Set(tags as Tag[])) revalidateTag(tag);
  return NextResponse.json({ ok: true, revalidated: tags });
}
