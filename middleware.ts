import { NextResponse, type NextRequest } from 'next/server';

/**
 * Admin gate, in front of every /admin page.
 *
 * 1. Signed-out visitors are sent to /admin/signin?next=<where they were going>
 *    before any page renders (the layout's requireUser() stays as a second
 *    check, and the backend enforces everything on every call regardless).
 * 2. Sliding sessions: when the backend extends a session it re-sends the
 *    cookie. Server components can't set cookies, so without this the
 *    browser's copy would expire at its original time even while the person
 *    is actively working. The middleware forwards that Set-Cookie.
 *
 * The pages for getting in (sign-in, forgot/reset password, invitations) are
 * public.
 */
const PUBLIC_ADMIN = [
  '/admin/signin',
  '/admin/forgot-password',
  '/admin/reset-password',
  '/admin/invite',
];

const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_ADMIN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const toSignIn = () => {
    const url = new URL('/admin/signin', req.url);
    url.search = '';
    if (pathname !== '/admin') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  };

  const cookie = req.headers.get('cookie');
  if (!cookie || !cookie.includes('ra_session=')) return toSignIn();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1/admin/auth/me`, {
      headers: { cookie, accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    // Backend unreachable: let the page render and show its error state
    // rather than bouncing a signed-in person to the sign-in form.
    return NextResponse.next();
  }
  if (res.status === 401) return toSignIn();

  const next = NextResponse.next();
  const refreshed = res.headers.get('set-cookie');
  if (refreshed) next.headers.append('set-cookie', refreshed);
  return next;
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
