import { ApiError, readApiResponse } from './errors';

/**
 * Calling the backend from the browser (client components). Same-origin
 * requests to /api/v1/*, which next.config.ts proxies to the backend — the
 * session cookie travels automatically and no CORS is involved.
 *
 *   const { user } = await api.post<{ user: AdminUser }>('/admin/auth/login', { username, password });
 *
 * Throws ApiError (with `.issues` / `.fieldErrors()` for validation failures).
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        accept: 'application/json',
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, null);
  }
  return readApiResponse<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};
