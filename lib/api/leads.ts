/**
 * Leads and fit-finder submissions — response shapes from the backend's
 * `leads` and `quiz` modules, plus the public intake calls the site's forms
 * make. Kept by hand, like lib/api/types.ts.
 */
import { api } from './client';
import type { QuizResult } from '@/lib/quiz/quiz';

/** Sources the website's forms (and Maya) may send. */
export const PUBLIC_LEAD_SOURCES = [
  'qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta', 'voice_agent',
] as const;
/** Sources for leads the team adds by hand or imports. */
export const TEAM_LEAD_SOURCES = ['manual', 'import', 'referral', 'outbound', 'event'] as const;
export const LEAD_SOURCES = [...PUBLIC_LEAD_SOURCES, ...TEAM_LEAD_SOURCES] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/** Every status a lead can hold. won/lost are legacy (shown, not offered). */
export const LEAD_STATUSES = [
  'new', 'contacted', 'qualified', 'nurturing', 'unqualified', 'spam', 'converted', 'won', 'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
/** What a person may pick on the lead page. */
export const SELECTABLE_STATUSES = ['new', 'contacted', 'qualified', 'nurturing', 'unqualified', 'spam'] as const;

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

/** Quick views on the leads list. '' = all leads. */
export const LEAD_VIEWS = [
  { key: '', label: 'All leads' },
  { key: 'mine', label: 'My leads' },
  { key: 'unassigned', label: 'Unassigned' },
  { key: 'followup', label: 'Follow-up due' },
  { key: 'hot', label: 'Hot' },
] as const;
export type LeadViewKey = (typeof LEAD_VIEWS)[number]['key'];

/* ── Admin ──────────────────────────────────────────────────────────────── */

/** The list filter. The CSV export takes the same keys (minus `before`). */
export interface LeadFilter {
  q?: string;
  source?: string;
  status?: string;
  /** mine | unassigned | followup | hot */
  view?: string;
  /** An owner's id, or 'none'. */
  owner?: string;
}

/** One row of GET /v1/admin/leads. */
export interface LeadListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  country: string | null;
  serviceInterest: string | null;
  source: LeadSource;
  status: LeadStatus;
  priority: Priority;
  score: number | null;
  tags: string[];
  ownerId: string | null;
  ownerName: string | null;
  nextFollowUpAt: string | null;
  firstContactedAt: string | null;
}

/** GET /v1/admin/leads/views */
export interface LeadViewCounts {
  all: number;
  mine: number;
  unassigned: number;
  followup: number;
  hot: number;
}

/** GET /v1/admin/leads/assignees — people a lead or task can go to. */
export interface Assignee {
  id: string;
  name: string;
  username: string;
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
  /* ── CRM ── */
  updatedAt: string;
  ownerId: string | null;
  ownerName: string | null;
  priority: Priority;
  score: number | null;
  tags: string[];
  nextFollowUpAt: string | null;
  firstContactedAt: string | null;
  convertedAt: string | null;
  disqualifyReason: string | null;
  custom: Record<string, unknown>;
  timeline: TimelineItem[];
  tasks: LeadTask[];
  fieldDefs: FieldDef[];
}

export type TimelineType =
  | 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'owner_change' | 'stage_change' | 'system';

/** One entry on a lead's timeline, newest first. */
export interface TimelineItem {
  id: string;
  type: TimelineType;
  body: string | null;
  meta: Record<string, unknown>;
  occurredAt: string;
  actorId: string | null;
  actorName: string | null;
}

export interface LeadTask {
  id: string;
  title: string;
  dueAt: string | null;
  doneAt: string | null;
  priority: Priority;
  assigneeId: string | null;
  assigneeName: string | null;
}

/** A qualification field definition (see lib/crm/fields.ts). */
export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'long_text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'url' | 'email' | 'phone';
  options?: string[] | null;
  required?: boolean;
  archivedAt?: string | null;
}

/** One row of GET /v1/admin/tasks. */
export interface TaskListItem extends LeadTask {
  leadId: string | null;
  leadName: string | null;
  leadEmail: string | null;
  leadCompany: string | null;
}

export interface TaskPage {
  items: TaskListItem[];
  counts: { open: number; overdue: number; done: number };
}

/** POST /v1/admin/leads/import */
export interface ImportResult {
  created: number;
  duplicates: { row: number; email: string }[];
  invalid: { row: number; message: string }[];
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
  for (const k of ['q', 'source', 'status', 'view', 'owner', 'before'] as const) {
    const v = f[k]?.trim();
    if (v) p.set(k, v);
  }
  return p.toString();
}

/** Where the Export button points: the backend's CSV, via the /api/v1 proxy. */
export function leadExportHref(f: LeadFilter): string {
  const qs = leadQuery({ q: f.q, source: f.source, status: f.status, view: f.view, owner: f.owner });
  return `/api/v1/admin/leads/export${qs ? `?${qs}` : ''}`;
}

/* ── CRM actions (browser) ──────────────────────────────────────────────── */

export const leadsApi = {
  setStatus: (id: string, status: string) => api.patch<LeadDetail>(`/admin/leads/${id}`, { status }),
  setOwner: (id: string, ownerId: string | null) => api.patch<LeadDetail>(`/admin/leads/${id}`, { ownerId }),
  setPriority: (id: string, priority: Priority) => api.patch<LeadDetail>(`/admin/leads/${id}`, { priority }),
  addNote: (id: string, body: string) => api.post<{ ok: true }>(`/admin/leads/${id}/notes`, { body }),
  logCall: (id: string, call: { outcome: string; minutes?: number; body?: string }) =>
    api.post<{ ok: true }>(`/admin/leads/${id}/calls`, call),
  addTask: (id: string, task: { title: string; priority?: Priority; dueAt?: string | null; assigneeId?: string }) =>
    api.post<LeadTask>(`/admin/leads/${id}/tasks`, task),
  setTaskDone: (taskId: string, done: boolean) => api.patch<LeadTask>(`/admin/tasks/${taskId}`, { done }),
  saveQualification: (id: string, custom: Record<string, unknown>) =>
    api.put<{ custom: Record<string, unknown> }>(`/admin/leads/${id}/qualification`, { custom }),
  create: (lead: Record<string, unknown>) => api.post<{ id: string }>('/admin/leads', lead),
  importRows: (rows: Record<string, unknown>[], ownerId?: string) =>
    api.post<ImportResult>('/admin/leads/import', { rows, ...(ownerId ? { ownerId } : {}) }),
};

/** Kept for existing callers. */
export const setLeadStatus = (id: string, status: LeadStatus) => leadsApi.setStatus(id, status);

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
