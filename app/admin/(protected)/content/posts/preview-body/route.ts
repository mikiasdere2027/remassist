import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { cleanHtml } from '@/lib/content/sanitize';

/**
 * Sanitizes an in-progress article body for the editor's Preview.
 *
 * Preview renders the post from what is on the form right now, unsaved, which
 * means the body has to be cleaned somewhere the editor can reach before it is
 * put through `dangerouslySetInnerHTML`. The alternative was a second
 * allowlist, written in DOM calls, running in the browser — and two
 * sanitizers with one job is how one of them ends up wrong. lib/content
 * /sanitize.ts stays the only allowlist there is; this is a door to it.
 *
 * It takes the HTML as a plain request body and answers with `text/plain`, so
 * the endpoint itself can never be opened as a page and rendered. It writes
 * nothing and reads nothing: same input, same output, no row involved.
 *
 * The (protected) layout does not cover route handlers — they render outside
 * the layout tree — so the gate is here, and it is the same one the post
 * actions use.
 */

/** Matches MAX_BODY in the post actions; a longer body could not be saved. */
const MAX_BODY = 120_000;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new NextResponse('Unauthorised', { status: 401 });
  if (!canEditContent(user.role)) return new NextResponse('Forbidden', { status: 403 });

  const html = await req.text();
  if (html.length > MAX_BODY) return new NextResponse('Too long', { status: 413 });

  return new NextResponse(cleanHtml(html), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
