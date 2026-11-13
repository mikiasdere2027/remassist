/** GET /v1/admin/dashboard — raw counts; labels and formatting stay here. */
import type { LeadSource, LeadStatus } from './leads';

export interface DashboardStats {
  leads: {
    total: number;
    byStatus: Record<LeadStatus, number>;
    bySource: Array<{ source: string; n: number }>;
    /** Oldest first, today last, UTC days (YYYY-MM-DD), zero-filled. */
    last14Days: Array<{ day: string; n: number }>;
    last24h: number;
  };
  quizzes: { total: number; completed: number; anonymous: number };
  recentLeads: Array<{
    id: string;
    createdAt: string;
    name: string | null;
    email: string;
    status: LeadStatus;
    source: LeadSource;
  }>;
  content: {
    faqLive: number;
    faqTotal: number;
    reviewsLive: number;
    postsLive: number;
    postsTotal: number;
  };
  /** Added with the leads slice; absent from older backend builds. */
  system?: { mailConfigured: boolean };
}
