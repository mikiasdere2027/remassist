import { BOOK_URL } from '@/lib/nav';
import type { OpenTime } from './slots';

/**
 * Calendly, for Maya's booking tools — server only.
 *
 * Books through Calendly's Scheduling API (POST /invitees), which schedules
 * exactly as the Calendly page would: the invitee and host get Calendly's own
 * confirmation and calendar invite, reminders and workflows run, and the
 * booking shows up in Calendly like any other. So nothing here sends mail,
 * which matters because this site's own mail sender is not verified.
 *
 * Needs CALENDLY_TOKEN: a personal access token from the account that owns
 * the booking link, with scopes users:read, event_types:read,
 * availability:read and scheduled_events:write. Booking itself needs a paid
 * Calendly plan; on Free, Calendly answers 403 and Maya falls back to "the
 * team will reach out".
 *
 * Docs: https://developer.calendly.com/docs/api-guides/schedule-events-with-ai-agents
 */

const API = 'https://api.calendly.com';

/** Which booking link Maya books into. Defaults to the site's own "Book a call" link. */
const EVENT_URL = (process.env.CALENDLY_EVENT_URL || BOOK_URL).replace(/\/$/, '');

export function calendlyConfigured(): boolean {
  return !!process.env.CALENDLY_TOKEN;
}

/** A Calendly failure, reduced to what Maya needs to decide what to say. */
export class CalendlyError extends Error {
  constructor(
    /** slot_taken: re-offer times. bad_input: check the details with the visitor.
        Everything else: the generic "can't book right now". */
    readonly code: 'slot_taken' | 'bad_input' | 'not_allowed' | 'rate_limited' | 'unavailable',
    readonly status: number,
    detail: string,
  ) {
    super(`calendly ${status}: ${detail}`);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      authorization: `Bearer ${process.env.CALENDLY_TOKEN}`,
      'content-type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (res.ok) return (await res.json()) as T;

  const body = await res.text().catch(() => '');
  /* 404/409 mean the time is no longer open. A 400 is either that or bad
     input (an email Calendly rejects); the exact body for a slot taken
     between listing and booking is not documented, so a 400 that names
     start_time is treated as taken and any other 400 as input. 401/403 are
     a token, scope or plan problem nobody on the website can fix. */
  const code =
    res.status === 404 || res.status === 409 ? 'slot_taken'
    : res.status === 400 ? (/start_time|slot|available/i.test(body) ? 'slot_taken' : 'bad_input')
    : res.status === 401 || res.status === 403 ? 'not_allowed'
    : res.status === 429 ? 'rate_limited'
    : 'unavailable';
  throw new CalendlyError(code, res.status, body.slice(0, 500));
}

interface Location {
  kind: string;
  location?: string;
}

interface Question {
  name: string;
  type: string;
  position: number;
  required: boolean;
  enabled?: boolean;
}

export interface EventType {
  uri: string;
  duration: number;
  pooling: string | null;
  locations: Location[];
  questions: Question[];
}

/* The event type never changes under us in practice, but its questions and
   locations are edited in Calendly, so re-read it now and then. */
let cached: { at: number; value: EventType } | undefined;
const CACHE_MS = 10 * 60_000;

/** Resolve the booking link (…/j-zemene-remassistance/new-meeting) to its event type. */
export async function eventType(): Promise<EventType> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const me = await call<{ resource: { uri: string } }>('/users/me');
  let next: string | null = `/event_types?user=${encodeURIComponent(me.resource.uri)}&active=true&count=100`;
  while (next) {
    const page: {
      collection: {
        uri: string;
        scheduling_url: string;
        duration: number;
        pooling_type: string | null;
        locations: Location[] | null;
        custom_questions: Question[] | null;
      }[];
      pagination: { next_page: string | null };
    } = await call(next);
    const hit = page.collection.find((e) => e.scheduling_url.replace(/\/$/, '') === EVENT_URL);
    if (hit) {
      const value: EventType = {
        uri: hit.uri,
        duration: hit.duration,
        pooling: hit.pooling_type,
        locations: hit.locations ?? [],
        questions: (hit.custom_questions ?? []).filter((q) => q.enabled !== false),
      };
      cached = { at: Date.now(), value };
      return value;
    }
    next = page.pagination.next_page ? page.pagination.next_page.replace(API, '') : null;
  }
  throw new CalendlyError('unavailable', 404, `no active event type at ${EVENT_URL}`);
}

/** Open start times in [from, to). Calendly caps the window at 31 days. */
export async function availableTimes(et: EventType, from: Date, to: Date): Promise<OpenTime[]> {
  const q = new URLSearchParams({
    event_type: et.uri,
    start_time: from.toISOString(),
    end_time: to.toISOString(),
  });
  const res = await call<{ collection: OpenTime[] }>(`/event_type_available_times?${q}`);
  return res.collection;
}

/** Location kinds that need nothing but the kind itself. */
const KIND_ONLY = new Set([
  'zoom_conference', 'google_conference', 'microsoft_teams_conference',
  'gotomeeting_conference', 'webex_conference', 'inbound_call',
]);

/**
 * The location to book with: the first one the event type offers that we can
 * fill in. Undefined means "send none" — right for an event type with no
 * location and required for round-robin ones.
 */
export function chooseLocation(et: EventType, phone?: string): Location | undefined {
  if (et.pooling === 'round_robin' || !et.locations.length) return undefined;
  for (const l of et.locations) {
    if (KIND_ONLY.has(l.kind)) return { kind: l.kind };
    if ((l.kind === 'physical' || l.kind === 'custom') && l.location) return { kind: l.kind, location: l.location };
    if ((l.kind === 'outbound_call' || l.kind === 'ask_invitee') && phone) return { kind: l.kind, location: phone };
  }
  /* Nothing we can satisfy: let Calendly reject it and Maya fall back. */
  return { kind: et.locations[0].kind };
}

/**
 * Answers for the event type's required questions, from what Maya gathered.
 * Free-text questions get the qualification summary and phone questions the
 * phone number. Anything else required (a select we cannot choose for the
 * visitor) makes this return null, and the booking falls back to the team.
 */
export function answerQuestions(et: EventType, summary: string, phone?: string) {
  const out: { question: string; answer: string; position: number }[] = [];
  for (const q of et.questions) {
    let answer: string | undefined;
    if (q.type === 'string' || q.type === 'text') answer = summary;
    else if (q.type === 'phone_number') answer = phone;
    if (answer) out.push({ question: q.name, answer: answer.slice(0, 1000), position: q.position });
    else if (q.required) return null;
  }
  return out;
}

export interface BookingInput {
  start: string;
  name: string;
  email: string;
  timezone: string;
  phone?: string;
  summary: string;
  utm?: Record<string, string>;
}

export interface Booking {
  eventUri: string;
  inviteeUri: string;
  cancelUrl: string;
  rescheduleUrl: string;
}

export async function book(et: EventType, b: BookingInput): Promise<Booking> {
  const questions = answerQuestions(et, b.summary, b.phone);
  if (!questions) throw new CalendlyError('not_allowed', 0, 'event type has required questions Maya cannot answer');

  const tracking = b.utm
    ? Object.fromEntries(
        Object.entries(b.utm).filter(([k]) => /^utm_(source|medium|campaign|content|term)$/.test(k)),
      )
    : undefined;
  const location = chooseLocation(et, b.phone);

  const res = await call<{
    resource: { uri: string; event: string; cancel_url: string; reschedule_url: string };
  }>('/invitees', {
    method: 'POST',
    body: JSON.stringify({
      event_type: et.uri,
      /* Calendly wants UTC with a trailing Z. */
      start_time: new Date(b.start).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      invitee: { name: b.name, email: b.email, timezone: b.timezone },
      ...(location ? { location } : {}),
      ...(questions.length ? { questions_and_answers: questions } : {}),
      ...(tracking && Object.keys(tracking).length ? { tracking } : {}),
    }),
  });
  return {
    eventUri: res.resource.event,
    inviteeUri: res.resource.uri,
    cancelUrl: res.resource.cancel_url,
    rescheduleUrl: res.resource.reschedule_url,
  };
}
