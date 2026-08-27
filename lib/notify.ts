/**
 * Lead notification — MIGRATION-PLAN §9.3.
 *
 * "A database nobody watches is not an improvement on an inbox." Every insert
 * fires a notification carrying the source, the page, and — for quiz
 * submissions — the answers and the quote the prospect actually saw.
 *
 * Transport is deliberately a webhook URL rather than an SMTP client: the
 * existing Slack workspace accepts one, and it keeps credentials to a single
 * env var instead of a mail configuration. Set LEAD_WEBHOOK_URL to enable.
 *
 * This must never fail a lead submission. Every caller is expected to ignore
 * the result, and every path here resolves.
 */
export interface LeadNotification {
  id: string;
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  message?: string;
  source: string;
  pageUrl?: string;
  quote?: string;
  answers?: Record<string, string>;
}

export function formatLeadNotification(n: LeadNotification): string {
  const lines = [
    `New lead — ${n.source}`,
    `Email: ${n.email}`,
  ];
  if (n.name) lines.push(`Name: ${n.name}`);
  if (n.company) lines.push(`Company: ${n.company}`);
  if (n.phone) lines.push(`Phone: ${n.phone}`);
  if (n.pageUrl) lines.push(`Page: ${n.pageUrl}`);
  if (n.quote) lines.push(`Quote shown: ${n.quote}`);
  if (n.answers && Object.keys(n.answers).length) {
    lines.push(`Answers: ${Object.entries(n.answers).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }
  if (n.message) lines.push(`Message: ${n.message}`);
  lines.push(`Lead id: ${n.id}`);
  return lines.join('\n');
}

export async function notifyNewLead(n: LeadNotification): Promise<void> {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;                       // not configured — silently skip
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: formatLeadNotification(n) }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    /* never fail a lead on the notifier */
  }
}
