import { api } from './client';
import type { LeadTask, Priority, TimelineItem } from './leads';

/**
 * The CRM beyond leads (companies, contacts, the pipeline, deals): response
 * types matching the backend's /v1/admin/{companies,contacts,crm,deals}
 * endpoints, and the browser-side calls. See remassist-backend
 * docs/CRM-PHASES-2-6.md and GLOSSARY.md for the terms.
 */

export const STAGE_KINDS = ['open', 'won', 'lost'] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export interface Stage {
  id: string;
  name: string;
  position: number;
  probability: number;
  kind: StageKind;
}

export interface LossReason {
  id: string;
  label: string;
}

export const ASSIGN_MODES = ['off', 'round_robin', 'single'] as const;
export type AssignMode = (typeof ASSIGN_MODES)[number];

export interface AutomationSettings {
  assignMode: AssignMode;
  pool: string[];
  defaultOwnerId: string | null;
  rules: Array<{ service: string; ownerId: string }>;
  firstContactTask: boolean;
  firstContactHours: number;
}

/** GET /v1/admin/crm/settings */
export interface CrmSettings {
  stages: Stage[];
  lossReasons: LossReason[];
  automation: AutomationSettings;
}

/* ── companies and contacts ─────────────────────────────────────────── */

/** One row of GET /v1/admin/companies. */
export interface CompanyListItem {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  country: string | null;
  ownerId: string | null;
  ownerName: string | null;
  contacts: number;
  openDeals: number;
  openValueCents: number;
  wonValueCents: number;
  createdAt: string;
}

export interface Contact {
  id: string;
  companyId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  ownerId: string | null;
  isPrimary: boolean;
  createdAt: string;
}

/** One row of GET /v1/admin/contacts. */
export interface ContactListItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  companyId: string | null;
  companyName: string | null;
  createdAt: string;
}

/** A deal as listed on a company's or lead's page. */
export interface DealSummary {
  id: string;
  title: string;
  stageName: string;
  stageKind: StageKind;
  monthlyValueCents: number;
  currency: string;
  expectedClose: string | null;
  closedAt: string | null;
}

/** GET /v1/admin/companies/:id */
export interface CompanyPage {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  size: string | null;
  country: string | null;
  website: string | null;
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
  contacts: Contact[];
  deals: DealSummary[];
  leads: Array<{ id: string; name: string | null; email: string; status: string; createdAt: string }>;
  tasks: LeadTask[];
  timeline: TimelineItem[];
}

/* ── deals ──────────────────────────────────────────────────────────── */

/** A card on the deals board (GET /v1/admin/deals). */
export interface DealCard {
  id: string;
  title: string;
  stageId: string;
  stageKind: StageKind;
  stageProbability: number;
  probability: number | null;
  service: string | null;
  seats: number | null;
  monthlyValueCents: number;
  currency: string;
  expectedClose: string | null;
  stageChangedAt: string;
  closedAt: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  ownerName: string | null;
}

export interface DealBoardData {
  items: DealCard[];
  thisMonth: {
    won: { n: number; valueCents: number };
    lost: { n: number; valueCents: number };
  };
}

/** GET /v1/admin/deals/:id */
export interface DealPage {
  id: string;
  title: string;
  companyId: string | null;
  contactId: string | null;
  leadId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  stageId: string;
  service: string | null;
  tier: string | null;
  seats: number | null;
  hoursPerMonth: number | null;
  rateCents: number | null;
  monthlyValueCents: number;
  currency: string;
  probability: number | null;
  expectedClose: string | null;
  stageChangedAt: string;
  closedAt: string | null;
  lossNote: string | null;
  createdAt: string;
  updatedAt: string;
  stage: { id: string; name: string; kind: StageKind; probability: number };
  company: { id: string; name: string; domain: string | null } | null;
  contact: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    jobTitle: string | null;
  } | null;
  lead: { id: string; name: string | null; email: string } | null;
  lossReason: string | null;
  timeline: TimelineItem[];
  tasks: LeadTask[];
}

/** What the New deal / Convert / Edit forms send (strings as typed). */
export type DealInput = Record<string, string | number | null | undefined>;

/** A record that has a timeline and tasks. */
export type RecordKind = 'lead' | 'deal' | 'company';
const BASE: Record<RecordKind, string> = {
  lead: '/admin/leads',
  deal: '/admin/deals',
  company: '/admin/companies',
};

export const crmApi = {
  /* notes, calls and tasks on any record */
  addNote: (kind: RecordKind, id: string, body: string) =>
    api.post(`${BASE[kind]}/${id}/notes`, { body }),
  logCall: (kind: RecordKind, id: string, call: { outcome: string; minutes?: number; body?: string }) =>
    api.post(`${BASE[kind]}/${id}/calls`, call),
  addTask: (
    kind: RecordKind,
    id: string,
    task: { title: string; priority?: Priority; dueAt?: string | null; assigneeId?: string },
  ) => api.post(`${BASE[kind]}/${id}/tasks`, task),

  /* deals */
  createDeal: (deal: DealInput) => api.post<{ id: string }>('/admin/deals', deal),
  convertLead: (leadId: string, deal: DealInput) =>
    api.post<{ id: string }>(`/admin/leads/${leadId}/convert`, deal),
  updateDeal: (id: string, deal: DealInput) => api.patch(`/admin/deals/${id}`, deal),
  setDealOwner: (id: string, ownerId: string | null) =>
    api.patch(`/admin/deals/${id}/owner`, { ownerId }),
  moveDeal: (id: string, move: { stageId: string; lossReasonId?: string; lossNote?: string }) =>
    api.post(`/admin/deals/${id}/move`, move),

  /* companies and contacts */
  updateCompany: (id: string, company: Record<string, string | null>) =>
    api.patch(`/admin/companies/${id}`, company),
  addContact: (contact: Record<string, string | boolean | null | undefined>) =>
    api.post<Contact>('/admin/contacts', contact),
  archiveContact: (id: string) => api.post(`/admin/contacts/${id}/archive`),

  /* settings (admins) */
  addStage: (stage: { name: string; probability: number }) => api.post('/admin/crm/stages', stage),
  updateStage: (id: string, stage: { name: string; probability: number }) =>
    api.patch(`/admin/crm/stages/${id}`, stage),
  moveStage: (id: string, direction: 'up' | 'down') =>
    api.post(`/admin/crm/stages/${id}/move`, { direction }),
  archiveStage: (id: string) => api.post(`/admin/crm/stages/${id}/archive`),
  addLossReason: (label: string) => api.post('/admin/crm/loss-reasons', { label }),
  updateLossReason: (id: string, label: string) => api.patch(`/admin/crm/loss-reasons/${id}`, { label }),
  archiveLossReason: (id: string) => api.post(`/admin/crm/loss-reasons/${id}/archive`),
  saveAutomation: (settings: AutomationSettings) => api.put('/admin/crm/automation', settings),
};
