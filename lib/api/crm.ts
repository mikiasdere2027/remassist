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

/** "Leads whose service interest contains this go to this person." */
export interface AssignmentRule {
  service: string;
  ownerId: string;
}

export interface AutomationSettings {
  assignMode: AssignMode;
  pool: string[];
  defaultOwnerId: string | null;
  rules: AssignmentRule[];
  firstContactTask: boolean;
  firstContactHours: number;
}

/** GET /v1/admin/crm/digest — today's digest, and what is connected. */
export interface DigestPreview {
  /** null when there is nothing to report. */
  text: string | null;
  /** A Slack channel is set on the server. */
  configured: boolean;
  /** The Calendly webhook has its signing key. */
  calendly: boolean;
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
  lifecycle: CompanyLifecycle;
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
  lifecycle: CompanyLifecycle;
  contacts: Contact[];
  deals: DealSummary[];
  engagements: EngagementSummary[];
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
  proposals: ProposalSummary[];
}

/* ── proposals ──────────────────────────────────────────────────────── */

export const PROPOSAL_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'withdrawn'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** A priced line, frozen into the proposal once sent. Money in cents. */
export interface ProposalLineRow {
  kind: 'monthly' | 'one_off';
  description: string;
  tier: string | null;
  coverage: string | null;
  seats: number | null;
  hoursPerMonth: number | null;
  rateCents: number | null;
  amountCents: number;
}

export interface ProposalTotals {
  monthlySubtotal: number;
  discount: number;
  monthly: number;
  oneOff: number;
  firstMonth: number;
  annual: number;
}

/** A deal's proposal, as listed on the deal page. */
export interface ProposalSummary {
  id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  monthlyCents: number;
  currency: string;
  sentAt: string | null;
  updatedAt: string;
}

/** One row of GET /v1/admin/proposals. */
export interface ProposalListItem extends ProposalSummary {
  oneOffCents: number;
  viewedAt: string | null;
  decidedAt: string | null;
  validUntil: string | null;
  dealId: string;
  companyName: string | null;
}

/** What the client sees (GET /v1/public/proposals/:token) — also what the document renders. */
export interface ProposalDocumentData {
  number: string;
  title: string;
  status: ProposalStatus;
  intro: string | null;
  terms: string | null;
  lines: ProposalLineRow[];
  discountBps: number;
  currency: string;
  monthlyCents: number;
  oneOffCents: number;
  validUntil: string | null;
  recipientName: string | null;
  sentAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  companyName: string | null;
  totals: ProposalTotals;
}

/** GET /v1/admin/proposals/:id */
export interface ProposalPage extends ProposalDocumentData {
  id: string;
  dealId: string;
  publicToken: string;
  recipientEmail: string | null;
  viewedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
  dealTitle: string;
  dealStageKind: StageKind;
}

/** GET /v1/admin/proposals/catalogue — the rate list lines are priced from. */
export interface RateCatalogue {
  tiers: Array<{ key: string; label: string; note: string | null; rateCents: number }>;
  coverage: Array<{ key: string; label: string; longLabel: string; seats: number; hours: number }>;
}

/* ── customers (engagements) ───────────────────────────────────────── */

export const ENGAGEMENT_STATUSES = ['onboarding', 'active', 'paused', 'churned'] as const;
export type EngagementStatus = (typeof ENGAGEMENT_STATUSES)[number];

/** A company's standing, derived from its engagements (GLOSSARY.md: Customer). */
export type CompanyLifecycle = 'customer' | 'former' | 'prospect';

export interface EngagementRole {
  role: string;
  seats: number;
  hoursPerMonth?: number | null;
  staff?: string[];
}

export interface OnboardingStep {
  key: string;
  label: string;
  doneAt?: string | null;
  /** The team member who ticked it. */
  doneBy?: string | null;
}

export interface OnboardingProgress {
  done: number;
  total: number;
  pct: number;
  complete: boolean;
}

/** Worked out by the backend from the renewal date and notice period. */
export interface RenewalState {
  daysLeft: number;
  due: boolean;
  overdue: boolean;
  noticeBy: string | null;
  noticePassed: boolean;
}

/** One row of GET /v1/admin/customers. */
export interface EngagementListItem {
  id: string;
  title: string;
  service: string | null;
  status: EngagementStatus;
  monthlyValueCents: number;
  currency: string;
  roles: EngagementRole[];
  onboarding: OnboardingStep[];
  startDate: string | null;
  renewalDate: string | null;
  noticeDays: number | null;
  dealId: string | null;
  companyId: string | null;
  companyName: string | null;
  ownerId: string | null;
  ownerName: string | null;
  progress: OnboardingProgress;
  renewal: RenewalState | null;
}

export interface CustomersData {
  items: EngagementListItem[];
  summary: {
    all: number;
    onboarding: number;
    active: number;
    paused: number;
    churned: number;
    renewal: number;
    /** Monthly recurring revenue: active and onboarding customers. */
    mrrCents: number;
  };
}

/** GET /v1/admin/customers/:id */
export interface EngagementPage {
  id: string;
  title: string;
  service: string | null;
  status: EngagementStatus;
  ownerId: string | null;
  ownerName: string | null;
  monthlyValueCents: number;
  currency: string;
  roles: EngagementRole[];
  onboarding: OnboardingStep[];
  startDate: string | null;
  contractEnd: string | null;
  renewalDate: string | null;
  noticeDays: number | null;
  churnedAt: string | null;
  churnReason: string | null;
  dealId: string | null;
  companyId: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string; domain: string | null } | null;
  deal: { id: string; title: string } | null;
  contacts: Contact[];
  timeline: TimelineItem[];
  tasks: LeadTask[];
  files: CustomerFile[];
  progress: OnboardingProgress;
  renewal: RenewalState | null;
}

/** Kinds of private file on a customer (contracts first). */
export const FILE_KINDS = ['contract', 'proposal', 'invoice', 'other'] as const;
export type FileKind = (typeof FILE_KINDS)[number];
export const FILE_KIND_LABELS: Record<FileKind, string> = {
  contract: 'Contract',
  proposal: 'Proposal',
  invoice: 'Invoice',
  other: 'File',
};

/** A private file on a customer. Opened only through fileUrl() by signed-in staff. */
export interface CustomerFile {
  id: string;
  kind: FileKind;
  name: string;
  mime: string;
  sizeBytes: number;
  createdAt: string;
  uploaderName: string | null;
}

/** Same limit the backend enforces (it answers 413 above it). */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Where the browser opens a private file: through the signed-in API proxy. */
export const fileUrl = (id: string) => `/api/v1/admin/files/${id}`;

/** A company's engagement, as listed on its page. */
export interface EngagementSummary {
  id: string;
  title: string;
  status: EngagementStatus;
  monthlyValueCents: number;
  currency: string;
  renewalDate: string | null;
}

/** What the New deal / Convert / Edit forms send (strings as typed). */
export type DealInput = Record<string, string | number | null | undefined>;

/** A record that has a timeline and tasks. */
export type RecordKind = 'lead' | 'deal' | 'company' | 'engagement';
const BASE: Record<RecordKind, string> = {
  lead: '/admin/leads',
  deal: '/admin/deals',
  company: '/admin/companies',
  engagement: '/admin/customers',
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

  /* proposals */
  draftProposal: (dealId: string) => api.post<{ id: string }>(`/admin/deals/${dealId}/proposals`),
  reviseProposal: (id: string) => api.post<{ id: string }>(`/admin/proposals/${id}/revise`),
  saveProposal: (id: string, proposal: Record<string, unknown>) => api.patch(`/admin/proposals/${id}`, proposal),
  sendProposal: (id: string) => api.post(`/admin/proposals/${id}/send`),
  withdrawProposal: (id: string) => api.post(`/admin/proposals/${id}/withdraw`),
  /** The client's answer, from /p/<token> (public). */
  answerProposal: (token: string, answer: { accept: boolean; name: string; note?: string | null }) =>
    api.post<{ ok: true; number: string }>(`/public/proposals/${encodeURIComponent(token)}/decision`, answer),

  /* customers (engagements) */
  setOnboardingStep: (id: string, key: string, done: boolean) =>
    api.patch(`/admin/customers/${id}/onboarding/${encodeURIComponent(key)}`, { done }),
  updateTerms: (id: string, terms: { title: string; service: string | null; monthlyValue: string | null }) =>
    api.patch(`/admin/customers/${id}/terms`, terms),
  updateRoles: (id: string, roles: string) => api.put(`/admin/customers/${id}/roles`, { roles }),
  updateContract: (id: string, contract: Record<string, string | null>) =>
    api.put(`/admin/customers/${id}/contract`, contract),
  setEngagementStatus: (id: string, status: string, reason?: string) =>
    api.post(`/admin/customers/${id}/status`, { status, ...(reason ? { reason } : {}) }),
  uploadCustomerFile: (id: string, form: FormData) =>
    api.upload<CustomerFile>(`/admin/customers/${id}/files`, form),
  archiveFile: (fileId: string) => api.delete(`/admin/files/${fileId}`),
  setEngagementOwner: (id: string, ownerId: string | null) =>
    api.patch(`/admin/customers/${id}/owner`, { ownerId }),

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
  sendDigest: () => api.post('/admin/crm/digest/send'),
};

/* ── Reports and the CRM dashboard (slice 8) ─────────────────────────── */

/** One report: the page renders it and its CSV holds the very same rows. */
export interface ReportTable {
  key: string;
  title: string;
  note: string;
  header: string[];
  rows: Array<Array<string | number>>;
  /** Columns that hold numbers (right-aligned). */
  numeric: number[];
}

/** GET /v1/admin/reports?range= */
export interface ReportsPage {
  range: string;
  ranges: Array<{ key: string; label: string }>;
  funnel: Array<{ key: string; label: string; count: number; ofTop: number | null; ofPrev: number | null }>;
  heatmap: {
    weeks: number;
    cells: Array<{ day: string; n: number; level: number; future: boolean }>;
    max: number;
    busiest: { day: string; n: number } | null;
  };
  tables: ReportTable[];
}

/** Where a report's CSV downloads from (signed in, through the proxy). */
export const reportCsvUrl = (key: string, range: string) =>
  `/api/v1/admin/reports/export?report=${encodeURIComponent(key)}&range=${encodeURIComponent(range)}`;

/** GET /v1/admin/dashboard/crm */
export interface CrmDashboard {
  numbers: {
    leads30: number;
    leadsPrev30: number;
    awaiting: number;
    converted30: number;
    openDeals: number;
    pipeline: number;
    weighted: number;
    mrr: number;
    customers: number;
    overdueMine: number;
    overdueAll: number;
  };
  topDeals: Array<{
    id: string;
    title: string;
    valueCents: number;
    currency: string;
    expectedClose: string | null;
    stage: string;
    probability: number;
    companyName: string | null;
  }>;
  comingUp: {
    tasks: Array<{
      id: string;
      title: string;
      dueAt: string | null;
      priority: string;
      leadId: string | null;
      dealId: string | null;
      companyId: string | null;
      engagementId: string | null;
    }>;
    renewals: Array<{
      id: string;
      title: string;
      renewalDate: string | null;
      companyName: string | null;
      valueCents: number;
      currency: string;
    }>;
  };
  activity: Array<{
    id: string;
    type: string;
    body: string | null;
    occurredAt: string;
    actorName: string;
    leadId: string | null;
    dealId: string | null;
    companyId: string | null;
    engagementId: string | null;
    leadName: string | null;
    dealTitle: string | null;
    companyName: string | null;
    engagementTitle: string | null;
  }>;
}
