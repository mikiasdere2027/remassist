import 'server-only';
import { cookies } from 'next/headers';
import { ApiError, readApiResponse } from './errors';

/**
 * Calling the backend from server components, route handlers and server
 * actions. Goes straight to API_URL (the backend on 127.0.0.1), forwarding the
 * visitor's cookies so admin requests act as the signed-in user.
 *
 * Browser code uses lib/api/client.ts instead (same paths, via the /api/v1
 * proxy in next.config.ts).
 */
export const API_URL = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

type Init = Omit<RequestInit, 'body'> & {
  /** JSON-serialised for you. */
  body?: unknown;
  /** Forward the visitor's cookies (default true). Public reads can skip it. */
  withCookies?: boolean;
};

/**
 * `path` is relative to /v1, e.g. `/admin/auth/me`. Throws ApiError on a
 * non-2xx answer, and ApiError(0) when the backend can't be reached.
 *
 * Admin calls default to `cache: 'no-store'` — they are per-user and must be
 * fresh. Public reads should pass `next: { tags: [...] }` instead.
 */
export async function apiServer<T>(path: string, init: Init = {}): Promise<T> {
  const { body, withCookies = true, headers, ...rest } = init;
  const h = new Headers(headers);
  h.set('accept', 'application/json');
  if (body !== undefined) h.set('content-type', 'application/json');
  if (withCookies) {
    const jar = await cookies();
    const cookie = jar
      .getAll()
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join('; ');
    if (cookie) h.set('cookie', cookie);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/v1${path}`, {
      cache: rest.next ? undefined : 'no-store',
      ...rest,
      headers: h,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null);
  }
  return readApiResponse<T>(res);
}
