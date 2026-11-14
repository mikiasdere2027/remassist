import { Type, type FunctionDeclaration } from '@google/genai';
import type { LeadSubmission } from '@/lib/api/leads';

/**
 * What Maya can do besides talk: hand a qualified visitor to the team
 * (capture_lead), and book them a consultation in Calendly
 * (check_availability, then book_meeting). The booking tools answer
 * `not_configured` until CALENDLY_TOKEN is set, and the prompt tells Maya to
 * fall back to "the team will reach out" when they do.
 */
export const CAPTURE_LEAD = 'capture_lead';
export const CHECK_AVAILABILITY = 'check_availability';
export const BOOK_MEETING = 'book_meeting';

export const captureLeadDeclaration: FunctionDeclaration = {
  name: CAPTURE_LEAD,
  description:
    'Save the visitor as a lead for the REM team to follow up. Call once, as soon as the visitor ' +
    'has given their name and a confirmed email, with everything learned so far.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Full name of the visitor.' },
      email: { type: Type.STRING, description: 'Email address, spelled back and confirmed.' },
      company: { type: Type.STRING, description: 'Company name.' },
      phone: { type: Type.STRING, description: 'Phone number, if offered.' },
      service: { type: Type.STRING, description: 'The REM service line that fits best, e.g. "SDR as a Service".' },
      teamSize: { type: Type.NUMBER, description: 'How many people they want to hire.' },
      workingHours: { type: Type.STRING, description: 'Hours or timezone the team must cover, e.g. "US Eastern business hours".' },
      notes: { type: Type.STRING, description: 'Short summary of their needs: inbound or outbound, tools, timeline, anything else relevant.' },
      meetingRequested: { type: Type.BOOLEAN, description: 'True if the visitor wants a consultation call.' },
      consentGiven: { type: Type.BOOLEAN, description: 'True only if the visitor clearly said they want the team to contact them.' },
    },
    required: ['name', 'email', 'meetingRequested', 'consentGiven'],
  },
};

export const checkAvailabilityDeclaration: FunctionDeclaration = {
  name: CHECK_AVAILABILITY,
  description:
    'Look up open times for a free consultation call with the REM team. Returns a few slots, each ' +
    'with a spoken label in the visitor\'s timezone and a start value to pass to book_meeting.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      fromDate: {
        type: Type.STRING,
        description: 'Earliest day to look from, as YYYY-MM-DD, if the visitor named one. Omit for "as soon as possible".',
      },
    },
  },
};

export const bookMeetingDeclaration: FunctionDeclaration = {
  name: BOOK_MEETING,
  description:
    'Book the consultation at a slot the visitor chose from check_availability. Calendly emails ' +
    'them the calendar invite. Call only after they confirmed the time and their email.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      start: { type: Type.STRING, description: 'The chosen slot\'s start value, exactly as check_availability returned it.' },
      name: { type: Type.STRING, description: 'Full name of the visitor.' },
      email: { type: Type.STRING, description: 'Email address, confirmed with the visitor.' },
      phone: { type: Type.STRING, description: 'Phone number, if offered.' },
      notes: { type: Type.STRING, description: 'One or two sentences on what they need, for the person taking the call.' },
    },
    required: ['start', 'name', 'email'],
  },
};

export const VOICE_TOOLS = [captureLeadDeclaration, checkAvailabilityDeclaration, bookMeetingDeclaration];

export interface CaptureLeadArgs {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  phone?: unknown;
  service?: unknown;
  teamSize?: unknown;
  workingHours?: unknown;
  notes?: unknown;
  meetingRequested?: unknown;
  consentGiven?: unknown;
}

/** Model output is untrusted: anything that is not a non-empty string is dropped. */
function str(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const s = String(v).trim();
  return s ? s.slice(0, max) : undefined;
}

/**
 * Map the model's function-call arguments onto the POST /v1/public/leads body.
 *
 * Kept pure so it is testable without a session. The qualification answers
 * have no columns of their own, so they go into `message` for the person
 * reading the lead and into `rawFields` for anything that queries them later.
 */
export function toLeadBody(args: CaptureLeadArgs, page?: string): Omit<LeadSubmission, 'attribution'> {
  const teamSize = str(args.teamSize, 10);
  const workingHours = str(args.workingHours, 200);
  const notes = str(args.notes, 3000);
  const meeting = args.meetingRequested === true;

  const lines = [
    meeting ? 'Meeting requested: YES' : 'Meeting requested: no',
    teamSize && `Team size: ${teamSize}`,
    workingHours && `Working hours: ${workingHours}`,
    notes && `Notes: ${notes}`,
  ].filter(Boolean);

  const rawFields: Record<string, string> = { meetingRequested: meeting ? 'yes' : 'no' };
  if (teamSize) rawFields.teamSize = teamSize;
  if (workingHours) rawFields.workingHours = workingHours;
  if (notes) rawFields.notes = notes;

  return {
    name: str(args.name, 120),
    email: str(args.email, 200) ?? '',
    company: str(args.company, 160),
    phone: str(args.phone, 40),
    service: str(args.service, 120),
    message: 'Captured by Maya (voice assistant).\n' + lines.join('\n'),
    consent: args.consentGiven === true,
    page,
    source: 'voice_agent',
    rawFields,
  };
}
