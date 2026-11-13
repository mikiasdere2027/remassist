/**
 * An error answer from the backend API. Shared by the server and browser
 * clients so callers handle failures the same way everywhere.
 *
 * The backend answers validation failures with
 * `{ message, issues: [{ path, message }] }` and other errors with
 * `{ message, statusCode }` (plus extras such as `missing` for publish gates).
 */
export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly issues: ApiIssue[];
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(ApiError.messageOf(status, body));
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    const issues = (body as { issues?: unknown } | null)?.issues;
    this.issues = Array.isArray(issues) ? (issues as ApiIssue[]) : [];
  }

  /** Field → message, for showing each validation error next to its input. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const i of this.issues) if (i.path && !out[i.path]) out[i.path] = i.message;
    return out;
  }

  private static messageOf(status: number, body: unknown): string {
    const m = (body as { message?: unknown } | null)?.message;
    if (typeof m === 'string' && m) return m;
    if (Array.isArray(m) && typeof m[0] === 'string') return m[0];
    if (status === 0) return 'Could not reach the server. Check your connection and try again.';
    if (status >= 500) return 'Something went wrong on our side. Please try again.';
    return `Request failed (${status})`;
  }
}

export function isApiError(e: unknown, status?: number): e is ApiError {
  return e instanceof ApiError && (status === undefined || e.status === status);
}

/** Parse a fetch Response into JSON, or throw ApiError. 204 → undefined. */
export async function readApiResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text.slice(0, 200) };
    }
  }
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}
