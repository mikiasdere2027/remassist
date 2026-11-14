import { companyDomainFromEmail } from './dedupe';

/**
 * Lead score, 0–100, with the reasons shown next to it so nobody has to trust
 * a bare number. Stored on the lead (leads.score) so lists can sort by it;
 * recomputed whenever the inputs change.
 */

export interface ScoreInput {
  source: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  serviceInterest?: string | null;
  /** From the fit-finder quiz, when the lead came through it. */
  quiz?: { completed?: boolean; seats?: number; timing?: string } | null;
}

export interface Score {
  score: number;
  priority: 'low' | 'medium' | 'high';
  reasons: string[];
}

const SOURCE_POINTS: Record<string, number> = {
  voice_agent: 20,
  qualify_quiz: 15,
  pricing_cta: 15,
  contact_form: 10,
  referral: 20,
  ask_widget: 5,
};

export function scoreLead(i: ScoreInput): Score {
  let score = 0;
  const reasons: string[] = [];
  const add = (n: number, why: string) => {
    score += n;
    reasons.push(`${n > 0 ? '+' : ''}${n} ${why}`);
  };

  const src = SOURCE_POINTS[i.source];
  if (src) add(src, `source: ${i.source.replace(/_/g, ' ')}`);
  if (companyDomainFromEmail(i.email)) add(15, 'work email');
  if (i.company?.trim()) add(10, 'company given');
  if (i.phone?.trim()) add(10, 'phone given');
  if (i.serviceInterest?.trim()) add(5, 'service chosen');
  if ((i.message?.trim().length ?? 0) >= 80) add(5, 'detailed message');

  if (i.quiz?.completed) add(5, 'finished the fit finder');
  const seats = i.quiz?.seats ?? 0;
  if (seats >= 5) add(15, `${seats} seats`);
  else if (seats >= 2) add(8, `${seats} seats`);
  if (i.quiz?.timing === 'now') add(10, 'needs help now');
  else if (i.quiz?.timing === 'soon') add(5, 'starting within a month');

  score = Math.max(0, Math.min(100, score));
  const priority = score >= 60 ? 'high' : score >= 35 ? 'medium' : 'low';
  return { score, priority, reasons };
}
