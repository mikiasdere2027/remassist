/**
 * The service catalogue.
 *
 * Two things needed one list and did not have it:
 *
 *  1. `Service` structured data (§11.1). Twelve pages each described their own
 *     service in a `metadata` export that JSON-LD could not read.
 *  2. Internal linking. Six of the twelve linked to no sibling service at all
 *     and six linked to /qualify from nowhere on the page, so a crawler
 *     reaching one service page found no path to the other eleven and the
 *     estimate tool was an orphan from most of the section.
 *
 * `description` is copied verbatim from each page's own `metadata.description`
 * — the two must agree, because one is what a crawler reads in the <head> and
 * the other is what it reads in the graph. `blurb` is the short line the
 * header's mega-menu already shows (lib/nav.ts), so the same service reads the
 * same way wherever it is linked from.
 *
 * NOT the same list as SERVICE_LINKS in lib/nav.ts, which is the header's
 * ordering and deliberately omits GTM Teams and SDR as a Service from the
 * mega-panel. lib/services.test.ts asserts every path here is a route in
 * ROUTES and that every `related` entry exists in this file.
 */

export interface Service {
  /** Route path, matching the entry in lib/site.ts ROUTES. */
  path: string;
  /** The service name, as the page's own <h1> region and metadata title use. */
  name: string;
  /** Verbatim from the page's metadata.description. */
  description: string;
  /** One-line summary for a link card. */
  blurb: string;
  /** Three sibling services, chosen for what a reader on this page would want next. */
  related: string[];
}

export const SERVICES: Service[] = [
  {
    path: '/services/sales-and-revenue',
    name: 'Sales & Revenue',
    description:
      'Six seats that build the list, work the channels, and put qualified meetings on your calendar — hired as one trained pod, without the recruiting cycle.',
    blurb: 'SDRs, lead gen, cold calling, outreach',
    related: ['/services/sdr-as-a-service', '/services/gtm-teams', '/services/marketing-and-content'],
  },
  {
    path: '/services/sdr-as-a-service',
    name: 'SDR as a Service',
    description:
      'Niche-trained SDRs who build lists, run multi-channel sequences, and book qualified meetings — a full outbound engine without the hiring cycle.',
    blurb: 'Lists, sequences, and booked meetings',
    related: ['/services/sales-and-revenue', '/services/gtm-teams', '/services/marketing-and-content'],
  },
  {
    path: '/services/gtm-teams',
    name: 'GTM Teams',
    description:
      'Outbound, marketing ops and CRM administration assembled into a single team that runs your motion end to end — one contract, one report, one weekly standup.',
    blurb: 'Outbound, marketing ops, CRM admin as one pod',
    related: ['/services/marketing-and-content', '/services/sdr-as-a-service', '/services/sales-and-revenue'],
  },
  {
    path: '/services/marketing-and-content',
    name: 'Marketing & Content',
    description:
      'A go-to-market pod — lead, outbound, content and RevOps — hired as one unit with one owner, built into the stack you already run.',
    blurb: 'GTM pods, campaigns, content, research',
    related: ['/services/gtm-teams', '/services/sales-and-revenue', '/services/ai-and-automation'],
  },
  {
    path: '/services/customer-service-agents',
    name: 'Customer Service Agents',
    description:
      'Dedicated agents answering by voice, chat and email inside your helpdesk — trained on your product, working your macros, QA-scored on every contact.',
    blurb: 'Voice, chat, email, technical support',
    related: ['/services/virtual-back-office-team', '/services/industry-specific', '/services/ai-and-automation'],
  },
  {
    path: '/services/virtual-back-office-team',
    name: 'Virtual Back Office Team',
    description:
      'The seats that keep operations running behind the front line, hired as one trained unit — you approve every agent before they start.',
    blurb: 'Data entry, documents, claims, EAs',
    related: ['/services/finance-and-accounting', '/services/customer-service-agents', '/services/industry-specific'],
  },
  {
    path: '/services/finance-and-accounting',
    name: 'Finance & Accounting',
    description:
      'Bookkeepers, AP and AR clerks, and payroll specialists working inside your ledger. Reconciled daily, closed monthly.',
    blurb: 'Bookkeeping, AP/AR, payroll',
    related: ['/services/virtual-back-office-team', '/services/hr-and-recruiting', '/services/industry-specific'],
  },
  {
    path: '/services/hr-and-recruiting',
    name: 'HR & Recruiting',
    description:
      'Sourcing, screening, interview coordination and onboarding administration, run inside your ATS and HRIS by a seat you interviewed.',
    blurb: 'Sourcing, onboarding, records',
    related: ['/services/finance-and-accounting', '/services/virtual-back-office-team', '/services'],
  },
  {
    path: '/services/managed-it',
    name: 'Managed IT',
    description:
      'Endpoints, help desk, security, and cloud — run as one coordinated layer, with the same operational discipline we bring to your sales and support seats.',
    blurb: 'Endpoints, help desk, security, cloud',
    related: ['/services/ai-and-automation', '/services/customer-service-agents', '/services'],
  },
  {
    path: '/services/ai-and-automation',
    name: 'AI & Automation',
    description:
      'We automate the high-volume half of a workflow and staff a trained seat on the half that needs a person — you decide where the line sits.',
    blurb: 'Workflows, agents, integration',
    related: ['/services/managed-it', '/services/marketing-and-content', '/services/virtual-back-office-team'],
  },
  {
    path: '/services/industry-specific',
    name: 'Industry Specific',
    description:
      'Medical billing, insurance servicing, legal support and freight dispatch — four desks where a general assistant does not get far.',
    blurb: 'Medical, insurance, legal, logistics',
    related: ['/services/virtual-back-office-team', '/services/customer-service-agents', '/services/finance-and-accounting'],
  },
  {
    path: '/services',
    name: 'All Services',
    description:
      'Everything we staff, in one place. One trained seat often covers several of these at once — take a single role, or a whole pod.',
    blurb: 'The full directory in one place',
    related: ['/services/sales-and-revenue', '/services/customer-service-agents', '/services/virtual-back-office-team'],
  },
];

const BY_PATH = new Map(SERVICES.map((s) => [s.path, s]));

export function serviceByPath(path: string): Service | undefined {
  return BY_PATH.get(path);
}

/** The three siblings a service points at, resolved to full records. */
export function relatedServices(path: string): Service[] {
  const service = BY_PATH.get(path);
  if (!service) return [];
  return service.related.map((p) => BY_PATH.get(p)).filter((s): s is Service => Boolean(s));
}
