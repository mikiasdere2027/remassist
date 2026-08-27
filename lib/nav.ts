/**
 * Navigation data.
 *
 * The desktop header renders its mega-menu markup by hand — each item carries
 * an icon, and the panels are pure CSS so the nav works with JavaScript off.
 * The mobile drawer cannot reuse that markup, so it reads the destinations from
 * here instead.
 *
 * lib/nav.test.ts asserts every href below is a route the app actually serves
 * and that the header still links it, so the two cannot drift apart silently.
 */
export interface NavLink {
  href: string;
  label: string;
  blurb?: string;
}

/** The service directory — the "Services" mega panel on desktop. */
export const SERVICE_LINKS: NavLink[] = [
  { href: '/services/sales-and-revenue', label: 'Sales & Revenue', blurb: 'SDRs, lead gen, cold calling, outreach' },
  { href: '/services/customer-service-agents', label: 'Customer Experience', blurb: 'Voice, chat, email, technical support' },
  { href: '/services/finance-and-accounting', label: 'Finance & Accounting', blurb: 'Bookkeeping, AP/AR, payroll' },
  { href: '/services/virtual-back-office-team', label: 'Back Office', blurb: 'Data entry, documents, claims, EAs' },
  { href: '/services/managed-it', label: 'Managed IT', blurb: 'Endpoints, help desk, security, cloud' },
  { href: '/services/hr-and-recruiting', label: 'HR & Recruiting', blurb: 'Sourcing, onboarding, records' },
  { href: '/services/industry-specific', label: 'Industry-Specific', blurb: 'Medical, insurance, legal, logistics' },
  { href: '/services/marketing-and-content', label: 'Marketing & Content', blurb: 'GTM pods, campaigns, content, research' },
  { href: '/services/ai-and-automation', label: 'AI & Automation', blurb: 'Workflows, agents, integration' },
  { href: '/services/extra-services', label: 'Everything we staff', blurb: 'The full directory in one place' },
];

/** The "Resources" mega panel. Case Studies is deliberately absent — the
 *  header marks it "coming soon" rather than linking it. */
export const RESOURCE_LINKS: NavLink[] = [
  { href: '/reviews', label: 'Reviews', blurb: 'Live reviews on Trustpilot' },
  { href: '/blog', label: 'Blog & Guides', blurb: 'Playbooks on delegation and operations' },
  { href: '/faq', label: 'FAQ', blurb: 'Pricing, onboarding, and data handling' },
];

/** Always-visible top-level items, in header order. */
export const PRIMARY_LINKS: NavLink[] = [
  { href: '/how-it-works', label: 'How it Works' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/qualify', label: 'Qualify' },
];

export const BOOK_URL = 'https://calendly.com/j-zemene-remassistance/new-meeting';
