/**
 * Popup ads — response shapes and request bodies for the backend's popups
 * module (remassist-backend src/modules/popups).
 *
 *   GET   /v1/admin/popups?status=&q=   → AdminPopup[]
 *   GET   /v1/admin/popups/:id          → AdminPopup
 *   POST  /v1/admin/popups              → AdminPopup (always a draft)
 *   PATCH /v1/admin/popups/:id          → AdminPopup (incl. { published })
 *   GET   /v1/public/popups             → { popups: LivePopup[] }
 *
 * A refused publish/save answers 400 with `missing: string[]` (labels of the
 * fields the template still needs) next to the usual `issues`.
 */
import { isApiError } from './errors';

export type PopupState = 'draft' | 'scheduled' | 'live' | 'ended';

export interface AdminPopup {
  id: string;
  name: string;
  title: string;
  message: string;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  campaign: string;
  trackingKey: string;
  placement: string;
  template: string;
  /** ISO instants, or null for "no bound". */
  startsAt: string | null;
  endsAt: string | null;
  delaySeconds: number;
  displaySeconds: number | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  /** Computed by the backend from published + schedule. */
  state: PopupState;
  /** Labels of required-but-empty fields; empty means publishable. */
  missing: string[];
}

/** The body for POST and (all fields optional) PATCH. */
export interface PopupInput {
  name: string;
  title: string;
  message: string;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  campaign: string;
  trackingKey: string;
  placement: string;
  template: string;
  /** ISO with an offset (toISOString), or null. */
  startsAt: string | null;
  endsAt: string | null;
  delaySeconds: number;
  displaySeconds: number | null;
}

/** One live popup as the public PopupManager renders it. */
export interface LivePopup {
  id: string;
  title: string;
  message: string;
  image: string | null;
  ctaLabel: string;
  ctaHref: string;
  campaign: string;
  trackingKey: string;
  placement: string;
  template: string;
  delaySeconds: number;
  displaySeconds: number | null;
}

/** The `missing` list from a refused publish/save, if that is what this is. */
export function missingFromError(err: unknown): string[] {
  if (!isApiError(err, 400)) return [];
  const m = (err.body as { missing?: unknown } | null)?.missing;
  return Array.isArray(m) ? m.filter((x): x is string => typeof x === 'string') : [];
}

/** "2026-09-08T10:30" (datetime-local, the browser's zone) → ISO, or null. */
export function localToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO → the "YYYY-MM-DDTHH:MM" a datetime-local input wants, in the browser's zone. */
export function isoToLocal(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
