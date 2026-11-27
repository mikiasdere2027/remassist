import { API_URL } from '@/lib/api/base-url';

const HEADERS = { 'cache-control': 'no-store' };

/**
 * The answer for GET /api/health, for the load balancer, the deploy script and
 * uptime monitors.
 *
 *   /api/health          the site process is up (cheap: no page render, no backend call)
 *   /api/health?deep=1   also the backend and its database (200, or 503)
 *
 * The deploy probes `?deep=1` once a release is live, so a site that renders
 * but cannot reach its API counts as a failed deploy; a monitor can poll the
 * cheap form often.
 */
export async function health(req: Request): Promise<Response> {
  if (new URL(req.url).searchParams.get('deep') !== '1') {
    return Response.json({ status: 'ok' }, { headers: HEADERS });
  }
  try {
    const res = await fetch(`${API_URL}/v1/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return Response.json({ status: 'ok', api: 'up' }, { headers: HEADERS });
  } catch {
    /* falls through to degraded */
  }
  return Response.json({ status: 'degraded', api: 'down' }, { status: 503, headers: HEADERS });
}
