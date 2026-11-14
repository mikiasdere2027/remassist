/**
 * The service catalogue.
 *
 * It exists for `Service` structured data (§11.1): twelve pages each described
 * their own service in a `metadata` export that JSON-LD could not read, so the
 * one list here is what ServiceJsonLd renders from.
 *
 * It used to carry a second job — the cross-link band that closed every service
 * page — which is what `blurb` and `related` fed. That band is gone, and those
 * two fields went with it. What is left is only what the graph reads.
 *
 * `description` is copied verbatim from each page's own `metadata.description`
 * — the two must agree, because one is what a crawler reads in the <head> and
 * the other is what it reads in the graph.
 *
 * NOT the same list as SERVICE_LINKS in lib/nav.ts, which is the header's
 * ordering and deliberately omits GTM Teams and SDR as a Service from the
 * mega-panel. lib/services.test.ts asserts every path here is a route in
 * ROUTES.
 */

export interface Service {
  /** Route path, matching the entry in lib/site.ts ROUTES. */
  path: string;
  /** The service name, as the page's own <h1> region and metadata title use. */
  name: string;
  /** Verbatim from the page's metadata.description. */
  description: string;
}

export const SERVICES: Service[] = [
  {
    path: '/services/sales-and-revenue',
    name: 'Sales & Revenue',
    description:
      'Six seats that build the list, work the channels, and put qualified meetings on your calendar — hired as one trained pod, without the recruiting cycle.',
  },
  {
    path: '/services/sdr-as-a-service',
    name: 'SDR as a Service',
    description:
      'Niche-trained SDRs who build lists, run multi-channel sequences, and book qualified meetings — a full outbound engine without the hiring cycle.',
  },
  {
    path: '/services/gtm-teams',
    name: 'GTM Teams',
    description:
      'Outbound, marketing ops and CRM administration assembled into a single team that runs your motion end to end — one contract, one report, one weekly standup.',
  },
  {
    path: '/services/marketing-and-content',
    name: 'Marketing & Content',
    description:
      'A go-to-market pod — lead, outbound, content and RevOps — hired as one unit with one owner, built into the stack you already run.',
  },
  {
    path: '/services/customer-service-agents',
    name: 'Customer Service Agents',
    description:
      'Dedicated agents answering by voice, chat and email inside your helpdesk — trained on your product, working your macros, QA-scored on every contact.',
  },
  {
    path: '/services/virtual-back-office-team',
    name: 'Virtual Back Office Team',
    description:
      'The seats that keep operations running behind the front line, hired as one trained unit — you approve every agent before they start.',
  },
  {
    path: '/services/finance-and-accounting',
    name: 'Finance & Accounting',
    description:
      'Bookkeepers, AP and AR clerks, and payroll specialists working inside your ledger. Reconciled daily, closed monthly.',
  },
  {
    path: '/services/hr-and-recruiting',
    name: 'HR & Recruiting',
    description:
      'Sourcing, screening, interview coordination and onboarding administration, run inside your ATS and HRIS by a seat you interviewed.',
  },
  {
    path: '/services/managed-it',
    name: 'Managed IT',
    description:
      'A dedicated IT team for help desk, devices, network, cloud, cybersecurity and backup — co-managed with your IT lead or fully managed, under independently audited ISO 9001 and ISO 27001 controls.',
  },
  {
    path: '/services/ai-and-automation',
    name: 'AI & Automation',
    description:
      'We automate the high-volume half of a workflow and staff a trained seat on the half that needs a person — you decide where the line sits.',
  },
  {
    path: '/services/industry-specific',
    name: 'Industry Specific',
    description:
      'Medical billing, insurance servicing, legal support and freight dispatch — four desks where a general assistant does not get far.',
  },
  {
    path: '/services',
    name: 'All Services',
    description:
      'Everything we staff, in one place. One trained seat often covers several of these at once — take a single role, or a whole pod.',
  },
];

const BY_PATH = new Map(SERVICES.map((s) => [s.path, s]));

export function serviceByPath(path: string): Service | undefined {
  return BY_PATH.get(path);
}
