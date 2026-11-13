/**
 * Where to go after signing in. Only paths inside the admin are allowed, so a
 * crafted `?next=` link can't bounce someone to another site after they enter
 * their password (an open redirect).
 */
export function safeAdminPath(next: string | null | undefined): string {
  if (!next) return '/admin';
  if (!next.startsWith('/admin') || next.startsWith('//') || next.includes('\\')) {
    return '/admin';
  }
  try {
    // Reject anything that resolves off-site, e.g. "/admin/../..//evil.com".
    const url = new URL(next, 'http://x.invalid');
    const inAdmin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
    if (url.host !== 'x.invalid' || !inAdmin) return '/admin';
    return url.pathname + url.search;
  } catch {
    return '/admin';
  }
}
