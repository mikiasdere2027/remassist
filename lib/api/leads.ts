/**
 * Leads and fit-finder submissions — response shapes from the backend's
 * `leads` and `quiz` modules, plus the public intake calls the site's forms
 * make. Kept by hand, like lib/api/types.ts.
 */
import { api } from './client';
import type { QuizResult } from '@/lib/quiz/quiz';

export const LEAD_SOURCES = ['qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/* ── Admin ──────────────────────────────────────────────────────────────── */

/** The list filter. The CSV export takes the same keys (minus `before`). */
export interface LeadFilter {
  q?: string;
  source?: string;
  status?: string;
}

/** One row of GET /v1/admin/leads. */
export interface LeadListItem {
  id: string;
  createdAt: string;
  name: string | null;
  email: string;
  company: string | null;
  country: string | null;
  source: LeadSource;
  status: LeadStatus;
}

/** A paged list: `total` counts the whole filter, not the page. */
export interface LeadPage {
  items: LeadListItem[];
  total: number;
  nextCursor: string | null;
}

export interface QuizSubmission {
  id: string;
  leadId: string | null;
  createdAt: string;
  answers: Record<string, string>;
  result: QuizResult | null;
  completed: boolean;
}

/** GET /v1/admin/leads/:id — the full row plus its linked quiz submissions. */
export interface LeadDetail {
  id: string;
  createdAt: string;
  status: LeadStatus;
  source: LeadSource;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  serviceInterest: string | null;
  message: string | null;
  consentAt: string | null;
  pageUrl: string | null;
  referrer: string | null;
  utm: Record<string, string> | null;
  rawFields: Record<string, string> | null;
  quizSubmissions: QuizSubmission[];
}

/** One row of GET /v1/admin/quiz-submissions (with the linked lead, if any). */
export interface QuizListItem extends QuizSubmission {
  leadEmail: string | null;
  leadName: string | null;
}

export interface QuizPage {
  items: QuizListItem[];
  total: number;
  anonymousTotal: number;
  nextCursor: string | null;
}

/** Only the keys the backend filters on, with empty values dropped. */
export function leadQuery(f: LeadFilter & { before?: string }): string {
  const p = new URLSearchParams();
  for (const k of ['q', 'source', 'status', 'before'] as const) {
    const v = f[k]?.trim();
    if (v) p.set(k, v);
  }
  return p.toString();
}

/** Where the Export button points: the backend's CSV, via the /api/v1 proxy. */
export function leadExportHref(f: LeadFilter): string {
  const qs = leadQuery({ q: f.q, source: f.source, status: f.status });
  return `/api/v1/admin/leads/export${qs ? `?${qs}` : ''}`;
}

export const setLeadStatus = (id: string, status: LeadStatus) =>
  api.patch<LeadDetail>(`/admin/leads/${id}`, { status });

/* ── Public intake (browser) ────────────────────────────────────────────── */

/** POST /v1/public/quiz — `result` is the server's quote; show that one. */
export interface QuizSubmitResponse {
  ok: true;
  stored: boolean;
  id: string | null;
  result: QuizResult;
}

export const submitQuiz = (answers: Record<string, string>, completed = true) =>
  api.post<QuizSubmitResponse>('/public/quiz', { answers, completed });

/** The body POST /v1/public/leads accepts (backend dto/lead.dto.ts). */
export interface LeadSubmission {
  email: string;
  source: LeadSource;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  country?: string;
  service?: string;
  message?: string;
  consent?: boolean;
  page?: string;
  honey?: string;
  attribution?: { first?: Record<string, string>; last?: Record<string, string> };
  rawFields?: Record<string, string>;
  /** The server prices `answers` itself; `submissionId` links the stored quiz row. */
  quiz?: { answers: Record<string, string>; completed?: boolean; submissionId?: string };
}

/* The backend caps `page` at 500 characters; a long tracking URL must not
   cost the lead, so it is trimmed rather than sent whole. */
export const submitLead = (body: LeadSubmission) =>
  api.post<{ ok: true; id: string }>('/public/leads', {
    ...body,
    page: body.page?.slice(0, 500),
  });
