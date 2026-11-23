import { SOURCE_LABELS } from '@/lib/leads/display';
import { formatMoney } from './money';
import { fmtDays, fmtHours, fmtPct, funnel, pct } from './reports';
import {
  byCampaign, bySource, funnelCounts, lossReasonsReport, responseTimes, revenueByService, stageTimes, winRates,
} from './reportsData';
import type { WorkspaceId } from './workspace';

/**
 * Every report as one table: the Reports page renders it and the CSV export
 * downloads the very same rows, so the two can never disagree.
 */
export interface ReportTable {
  key: ReportKey;
  title: string;
  note: string;
  header: string[];
  rows: Array<Array<string | number>>;
  /** Columns that hold numbers (right-aligned on the page). */
  numeric: number[];
}

export const REPORT_KEYS = ['funnel', 'sources', 'campaigns', 'response', 'owners', 'stages', 'losses', 'services'] as const;
export type ReportKey = (typeof REPORT_KEYS)[number];

export function isReportKey(k: string): k is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(k);
}

export async function reportTable(key: ReportKey, ws: WorkspaceId, from: Date | null): Promise<ReportTable> {
  switch (key) {
    case 'funnel': {
      const f = await funnelCounts(ws, from);
      const steps = funnel([
        { key: 'leads', label: 'Leads (not spam)', count: f.leads },
        { key: 'contacted', label: 'Contacted', count: f.contacted },
        { key: 'qualified', label: 'Qualified', count: f.qualified },
        { key: 'converted', label: 'Converted to a deal', count: f.converted },
        { key: 'won', label: 'Deal won', count: f.won },
      ]);
      return {
        key, title: 'Lead funnel', note: 'Leads received in the period, and how far each got.',
        header: ['Step', 'Leads', '% of all leads', '% of previous step'],
        rows: steps.map((s) => [s.label, s.count, fmtPct(s.ofTop), s.ofPrev === null ? '' : fmtPct(s.ofPrev)]),
        numeric: [1, 2, 3],
      };
    }
    case 'sources': {
      const rows = await bySource(ws, from);
      return {
        key, title: 'Conversion by source', note: 'Where leads came from, and which sources turn into customers.',
        header: ['Source', 'Leads', 'Converted', 'Conversion rate', 'Won monthly value'],
        rows: rows.map((r) => [SOURCE_LABELS[r.source] ?? r.source, r.leads, r.converted, fmtPct(pct(r.converted, r.leads)), formatMoney(Number(r.wonValue))]),
        numeric: [1, 2, 3, 4],
      };
    }
    case 'campaigns': {
      const rows = await byCampaign(ws, from);
      return {
        key, title: 'Conversion by campaign', note: 'The utm_source and utm_campaign of each lead’s last visit before enquiring.',
        header: ['utm_source', 'utm_campaign', 'Leads', 'Converted', 'Conversion rate'],
        rows: rows.map((r) => [r.utmSource, r.utmCampaign, r.leads, r.converted, fmtPct(pct(r.converted, r.leads))]),
        numeric: [2, 3, 4],
      };
    }
    case 'response': {
      const r = await responseTimes(ws, from);
      return {
        key, title: 'First response time', note: `From the enquiry to the first call or status change. ${r.waiting} new ${r.waiting === 1 ? 'lead is' : 'leads are'} still waiting.`,
        header: ['Owner', 'Leads contacted', 'Median', '90% within', 'Within 24 h'],
        rows: [
          ['Everyone', r.overall.count, fmtHours(r.overall.median), fmtHours(r.overall.p90), fmtPct(r.overall.within24)],
          ...r.owners.map((o) => [o.owner, o.count, fmtHours(o.median), fmtHours(o.p90), fmtPct(o.within24)]),
        ],
        numeric: [1, 2, 3, 4],
      };
    }
    case 'owners': {
      const rows = await winRates(ws, from);
      return {
        key, title: 'Win rate by owner', note: 'Deals closed in the period (won or lost) and what is open now.',
        header: ['Owner', 'Open deals', 'Open monthly value', 'Won', 'Lost', 'Win rate', 'Won monthly value'],
        rows: rows.map((r) => [
          r.ownerName?.trim() || r.ownerEmail || 'Unassigned', r.open, formatMoney(Number(r.openValue)), r.won, r.lost,
          fmtPct(pct(r.won, r.won + r.lost)), formatMoney(Number(r.wonValue)),
        ]),
        numeric: [1, 2, 3, 4, 5, 6],
      };
    }
    case 'stages': {
      const rows = await stageTimes(ws, from);
      return {
        key, title: 'Time in each stage', note: 'For deals created in the period; deals still open count up to today.',
        header: ['Stage', 'Deals that were in it', 'Average time', 'Median time'],
        rows: rows.map((r) => [r.stage, r.deals, fmtDays(r.avgDays), fmtDays(r.medianDays)]),
        numeric: [1, 2, 3],
      };
    }
    case 'losses': {
      const rows = await lossReasonsReport(ws, from);
      return {
        key, title: 'Why deals were lost', note: 'Deals marked lost in the period, by the reason given.',
        header: ['Reason', 'Deals', 'Monthly value lost'],
        rows: rows.map((r) => [r.reason, r.n, formatMoney(Number(r.value))]),
        numeric: [1, 2],
      };
    }
    case 'services': {
      const rows = await revenueByService(ws, from);
      return {
        key, title: 'Revenue by service', note: 'Recurring revenue from live customers today, and deals won in the period.',
        header: ['Service', 'Live customers', 'Monthly recurring revenue', 'Deals won', 'Won monthly value'],
        rows: rows.map((r) => [r.service, r.customers, formatMoney(r.mrr), r.won, formatMoney(r.wonValue)]),
        numeric: [1, 2, 3, 4],
      };
    }
  }
}
