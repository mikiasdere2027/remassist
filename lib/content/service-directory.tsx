import type { ReactNode } from 'react';

/**
 * The service directory — nine practice areas, thirty-five roles.
 *
 * Lifted out of app/services/page.tsx, where the same nine blocks were written
 * by hand as <details> elements: ~330 lines of markup differing only in their
 * content. As data it is one shape, rendered once by
 * components/services/ServiceDirectory.tsx.
 *
 * `id` is load-bearing: the hero chips on /services link to #sales-revenue and
 * the other eight, and those anchors are what the tab component reads to decide
 * which panel to open. Renaming one silently breaks a link in the hero.
 *
 * `href` on an item is optional on purpose. A role links out only where a
 * service page genuinely covers it — the rest are named here and nowhere else,
 * and a link landing on a page that is not about the thing you clicked is
 * worse than no link. That split is inherited from the markup this replaced.
 */
export interface DirectoryItem {
  name: string;
  desc: string;
  /** Present only where a service page actually covers this role. */
  href?: string;
  /** 24x24 stroke icon, drawn by the card. Same vocabulary as the category
   *  icons above: no fills, 2px round-capped strokes, one idea per glyph. */
  icon: ReactNode;
}

export interface DirectoryCategory {
  /** Anchor id — the hero chips link to these. */
  id: string;
  name: string;
  blurb: string;
  icon: ReactNode;
  /**
   * Landscape photograph for the featured carousel's right half. Only the
   * three featured categories carry one — the other six are never shown that
   * way, and a field filled in for the sake of being filled in is worse than
   * an absent one.
   */
  photo?: string;
  /**
   * The practice area's own page. `label` is not rendered at the moment — the
   * hero's three cards all read "Explore More" and carry the category name in
   * their aria-label instead — but it is kept as the written-out name of the
   * destination, which is what any other link to it should say.
   */
  more: { href: string; label: string };
  items: DirectoryItem[];
}

export const DIRECTORY: DirectoryCategory[] = [
  {
    id: 'sales-revenue',
    photo: '/images/Agents/Pro.jpg',
    name: 'Sales & Revenue',
    blurb: 'Pipeline built and worked by dedicated reps.',
    icon: <><path d='m4 17 5-5 4 3 6-7' /><path d='M15 8h4v4' /></>,
    more: { href: '/services/sales-and-revenue', label: 'Full Sales and Revenue page' },
    items: [
      {
        name: 'SDR as a Service',
        desc: 'Outbound reps booking qualified meetings',
        href: '/services/sdr-as-a-service',
        icon: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20v-1.4A4.6 4.6 0 0 1 8.1 14h2.4" /><path d="m14.5 17.5 2 2 4-4" /></>,
      },
      {
        name: 'Lead Generation & List Building',
        desc: 'Verified, ICP-matched contact data',
        icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20v-1.2A4.8 4.8 0 0 1 7.8 14h2.4a4.8 4.8 0 0 1 4.8 4.8V20" /><path d="M17 5.2a3.2 3.2 0 0 1 0 6.2M21 20v-1.2a4.6 4.6 0 0 0-3.2-4.4" /></>,
      },
      {
        name: 'Cold Calling Teams',
        desc: 'Your scripts, dispositions and CRM',
        icon: <><path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" /></>,
      },
      {
        name: 'Appointment Setting',
        desc: 'Scheduling with no-show recovery',
        icon: <><path d="M8 2v4m8-4v4M3.5 9.5h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5Z" /></>,
      },
      {
        name: 'Email Outreach & Campaigns',
        desc: 'Sequences, deliverability, replies',
        icon: <><path d="M3.5 6.5h17v11h-17z" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
      },
      {
        name: 'Virtual Sales Teams',
        desc: 'Full-cycle reps, through close',
        icon: <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><path d="M2.5 19v-.8A4.2 4.2 0 0 1 6.7 14h2.6M14.7 14h2.6a4.2 4.2 0 0 1 4.2 4.2V19" /></>,
      },
    ],
  },
  {
    id: 'customer-experience',
    photo: '/images/Agents/Customer support employee.webp',
    name: 'Customer Service',
    blurb: 'The front line, covered across your hours.',
    icon: <><path d='M4 17v-5a8 8 0 0 1 16 0v5' /><path d='M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z' /></>,
    more: { href: '/services/customer-service-agents', label: 'Full Customer Service page' },
    items: [
      {
        name: 'Inbound Customer Support',
        desc: 'Voice, chat and email coverage',
        href: '/services/customer-service-agents',
        icon: <><path d="M4 17v-5a8 8 0 0 1 16 0v5" /><path d="M20 18a2 2 0 0 1-2 2h-.8a1.8 1.8 0 0 1-1.8-1.8v-2.4A1.8 1.8 0 0 1 17.2 14H20zM4 18a2 2 0 0 0 2 2h.8a1.8 1.8 0 0 0 1.8-1.8v-2.4A1.8 1.8 0 0 0 6.8 14H4z" /></>,
      },
      {
        name: 'Technical Support',
        desc: 'Product-trained agents who resolve',
        href: '/services/customer-service-agents',
        icon: <><path d="M15.5 3.5a5 5 0 0 0-6 6.4L3.6 15.8a2 2 0 1 0 2.8 2.8l5.9-5.9a5 5 0 0 0 6.4-6l-2.8 2.8-2.1-2.1z" /></>,
      },
      {
        name: 'Order & Fulfillment Support',
        desc: 'Order entry, tracking and returns',
        icon: <><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2z" /><path d="m4 7.2 8 4.2 8-4.2M12 11.4V21" /></>,
      },
    ],
  },
  {
    id: 'finance',
    photo: '/images/Agents/Expert.jpg',
    name: 'Finance & Accounting',
    blurb: 'Clean books, closed on time, with an audit trail.',
    icon: <><path d='M3 10h18M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z' /><path d='M9 15h4' /></>,
    more: { href: '/services/finance-and-accounting', label: 'Full Finance and Accounting page' },
    items: [
      {
        name: 'Bookkeeping & Accounting',
        desc: 'Reconciliation and month-end close',
        href: '/services/finance-and-accounting',
        icon: <><path d="M5 4.5h13a1.5 1.5 0 0 1 1.5 1.5v13.5H6.5A1.5 1.5 0 0 1 5 18z" /><path d="M5 16.5h14.5M9 8.5h6" /></>,
      },
      {
        name: 'Accounts Payable & Receivable',
        desc: 'Invoices, vendors and collections',
        href: '/services/finance-and-accounting',
        icon: <><path d="M4 8.5h13m-3-3 3 3-3 3" /><path d="M20 15.5H7m3 3-3-3 3-3" /></>,
      },
      {
        name: 'Payroll Processing',
        desc: 'Multi-state runs, filings, records',
        href: '/services/finance-and-accounting',
        icon: <><rect x="3" y="6.5" width="18" height="11" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6.5 10v4M17.5 10v4" /></>,
      },
    ],
  },
  {
    id: 'back-office',
    name: 'Back Office',
    blurb: 'The work that keeps operations running behind the front line.',
    icon: <><path d='M4 6h16M4 12h16M4 18h10' /></>,
    more: { href: '/services/virtual-back-office-team', label: 'Full Back Office page' },
    items: [
      {
        name: 'Data Entry & Processing',
        desc: 'High-volume, accuracy-audited work',
        href: '/services/virtual-back-office-team',
        icon: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></>,
      },
      {
        name: 'Document Management',
        desc: 'Digitization, indexing, transcription',
        icon: <><path d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" /><path d="M14 3.5V8h4" /><path d="M9 13h6M9 16h4" /></>,
      },
      {
        name: 'Claims & Application Processing',
        desc: 'Intake, verification and routing',
        icon: <><path d="M9 4.5H7A1.5 1.5 0 0 0 5.5 6v13A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 17 4.5h-2" /><rect x="9" y="2.5" width="6" height="4" rx="1" /><path d="m9.5 13 2 2 3.5-4" /></>,
      },
      {
        name: 'Executive & Virtual Assistants',
        desc: 'Dedicated admin in your workflow',
        href: '/services/virtual-back-office-team',
        icon: <><circle cx="9" cy="8" r="3.4" /><path d="M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2" /><circle cx="17" cy="16" r="4.2" /><path d="M17 14.2V16l1.3 1" /></>,
      },
    ],
  },
  {
    id: 'managed-it',
    name: 'Managed IT',
    blurb: 'Your digital backbone, monitored and maintained.',
    icon: <><rect x='3' y='4' width='18' height='7' rx='2' /><rect x='3' y='13' width='18' height='7' rx='2' /><path d='M7 7.5h.01M7 16.5h.01' /></>,
    more: { href: '/services/managed-it', label: 'Full Managed IT page' },
    items: [
      {
        name: 'Managed IT Services',
        desc: 'Endpoints, networks and monitoring',
        href: '/services/managed-it',
        icon: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
      },
      {
        name: 'IT Help Desk',
        desc: 'Tier 1 and Tier 2 support',
        icon: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="m6 6 3.5 3.5M14.5 14.5 18 18M18 6l-3.5 3.5M9.5 14.5 6 18" /></>,
      },
      {
        name: 'Cybersecurity & Compliance',
        desc: 'Threat monitoring and access control',
        icon: <><path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" /><path d="m9 12 2 2 4-4" /></>,
      },
      {
        name: 'Cloud & Infrastructure',
        desc: 'Migration, backup and recovery',
        href: '/services/managed-it',
        icon: <><path d="M7.5 18.5h9.2a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.5 1.4 3.4 3.4 0 0 0 .9 6.6Z" /></>,
      },
    ],
  },
  {
    id: 'hr-recruiting',
    name: 'HR & Recruiting',
    blurb: 'An extension of your people team.',
    icon: <><circle cx='9' cy='8' r='3.4' /><path d='M3 20v-1.4A4.6 4.6 0 0 1 7.6 14h2.8a4.6 4.6 0 0 1 4.6 4.6V20' /><path d='M16.5 4.6a3.4 3.4 0 0 1 0 6.6M21 20v-1.4a4.6 4.6 0 0 0-3.2-4.4' /></>,
    more: { href: '/services/hr-and-recruiting', label: 'Full HR and Recruiting page' },
    items: [
      {
        name: 'Recruiting Support',
        desc: 'Sourcing, screening, scheduling',
        href: '/services/hr-and-recruiting',
        icon: <><circle cx="10" cy="8" r="3.4" /><path d="M3.5 20v-1.4A4.6 4.6 0 0 1 8.1 14h2" /><circle cx="17" cy="15" r="3" /><path d="m19.2 17.2 2.3 2.3" /></>,
      },
      {
        name: 'HR Administration',
        desc: 'Onboarding, records, benefits admin',
        href: '/services/hr-and-recruiting',
        icon: <><rect x="4" y="4.5" width="16" height="15" rx="2" /><circle cx="12" cy="10" r="2.6" /><path d="M8 16.5a4 4 0 0 1 8 0" /></>,
      },
    ],
  },
  {
    id: 'industry',
    name: 'Industry-Specific',
    blurb: 'Regulated, specialist work handled by agents trained for it.',
    icon: <><rect x='3' y='7' width='18' height='13' rx='2' /><path d='M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18' /></>,
    more: { href: '/services/industry-specific', label: 'Full Industry-Specific page' },
    items: [
      {
        name: 'Medical Billing & RCM',
        desc: 'Claims, denials, appeals, A/R recovery',
        href: '/services/industry-specific',
        icon: <><path d="M6 3.5h8l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" /><path d="M14 3.5V8h4" /><path d="M11.5 11.5v5M9 14h5" /></>,
      },
      {
        name: 'Insurance Back Office',
        desc: 'Submissions, servicing and renewals',
        href: '/services/industry-specific',
        icon: <><path d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" /><path d="M12 8.5v7M8.5 12h7" /></>,
      },
      {
        name: 'Legal Process Outsourcing',
        desc: 'Document review, intake, case files',
        href: '/services/industry-specific',
        icon: <><path d="M12 4v16M7.5 20h9" /><path d="M12 7 5.5 9M12 7l6.5 2" /><path d="M2.5 14a3 3 0 0 0 6 0L5.5 9zM15.5 14a3 3 0 0 0 6 0L18.5 9z" /></>,
      },
      {
        name: 'Logistics & Dispatch Support',
        desc: 'Load ops and freight billing',
        href: '/services/industry-specific',
        icon: <><path d="M3 6.5h10v9H3z" /><path d="M13 9.5h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
      },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing & Content',
    blurb: 'The go-to-market motion, staffed as one pod.',
    icon: <><path d='M4 10v4l12 5V5z' /><path d='M16 9a3 3 0 0 1 0 6' /></>,
    more: { href: '/services/marketing-and-content', label: 'Full Marketing and Content page' },
    items: [
      {
        name: 'GTM Teams',
        desc: 'A marketing ops pod hired as one unit',
        href: '/services/gtm-teams',
        icon: <><path d="M4 19V9M10 19V5M16 19v-6" /><path d="M2 19h20" /></>,
      },
      {
        name: 'Marketing Support',
        desc: 'SEO, social, print and campaigns',
        href: '/services/marketing-and-content',
        icon: <><path d="M4 10.5v3A1.5 1.5 0 0 0 5.5 15H8l6 4V5L8 9H5.5A1.5 1.5 0 0 0 4 10.5Z" /><path d="M17.5 9.5a4 4 0 0 1 0 5" /></>,
      },
      {
        name: 'Content & Brand Management',
        desc: 'Content and identity across platforms',
        href: '/services/marketing-and-content',
        icon: <><path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" /><path d="m14.5 6.5 3 3" /></>,
      },
      {
        name: 'Research & Analysis',
        desc: 'Market and product research',
        href: '/services/marketing-and-content',
        icon: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4.5 4.5" /><path d="M8 12v-1.5M10.5 12V8.5M13 12v-3" /></>,
      },
    ],
  },
  {
    id: 'ai-automation',
    name: 'AI & Automation',
    blurb: 'Software does the volume; our agents keep the judgment calls.',
    icon: <><path d='m12 3 1.7 4.4 4.4 1.7-4.4 1.7L12 15.2l-1.7-4.4L5.9 9.1l4.4-1.7z' /><path d='m18.5 15.5.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' /></>,
    more: { href: '/services/ai-and-automation', label: 'Full AI and Automation page' },
    items: [
      {
        name: 'AI Automations',
        desc: 'Automate repetitive workflows',
        href: '/services/ai-and-automation',
        icon: <><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="m18.5 15.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></>,
      },
      {
        name: 'AI Implementation',
        desc: 'Guided rollout into your operations',
        href: '/services/ai-and-automation',
        icon: <><path d="M12 3c3.5 2 5.5 5.4 5.5 9.5L12 18l-5.5-5.5C6.5 8.4 8.5 5 12 3Z" /><circle cx="12" cy="10.5" r="1.8" /><path d="M9 19c-.8 1-1 2-1 2s1.2-.2 2-1M15 19c.8 1 1 2 1 2s-1.2-.2-2-1" /></>,
      },
      {
        name: 'AI Agents & Chatbots',
        desc: 'Inbound chat, FAQs, qualification',
        href: '/services/ai-and-automation',
        icon: <><path d="M20.5 12.5a7.5 7.5 0 0 1-10.9 6.7L4.5 20.5l1.3-5.1A7.5 7.5 0 1 1 20.5 12.5Z" /><path d="M9 12h.01M12 12h.01M15 12h.01" /></>,
      },
      {
        name: 'Workflow & Systems Integration',
        desc: 'Connect your stack end to end',
        href: '/services/ai-and-automation',
        icon: <><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="18" r="2.5" /><path d="M8.5 6h7M7.2 8.1l3.5 7.7M16.8 8.1l-3.5 7.7" /></>,
      },
      {
        name: 'AI-Assisted Back Office',
        desc: 'AI does volume, agents do judgment',
        href: '/services/ai-and-automation',
        icon: <><path d="m12 4 8 4-8 4-8-4z" /><path d="m4 12 8 4 8-4" /><path d="m18.2 16.4.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6z" /></>,
      },
    ],
  },
];

/**
 * The three lines the site already leads with — they are 01, 02 and 03 in the
 * home page's service grid (components/home/ServiceGrid.tsx), so featuring the
 * same three here is following the site's own order rather than inventing one.
 *
 * They are lifted out of the tab rail and given their own section above it.
 * The ids travel with them, which is what keeps the hero's nine category chips
 * working: three now resolve to a featured card and six to a tab panel, and
 * neither the hero nor any of its links had to change.
 */
export const FEATURED_IDS = ['sales-revenue', 'customer-experience', 'finance'];

export const featuredCategories = (): DirectoryCategory[] =>
  DIRECTORY.filter((c) => FEATURED_IDS.includes(c.id));

export const otherCategories = (): DirectoryCategory[] =>
  DIRECTORY.filter((c) => !FEATURED_IDS.includes(c.id));

/**
 * The two-digit label a category shows instead of an icon.
 *
 * Numbered off DIRECTORY order, which is why FEATURED_IDS are the first three
 * entries: the featured band gets 01–03 and the rail below continues 04–09, so
 * the two sections read as one sequence rather than two lists that both start
 * at one. Add a category in the middle of DIRECTORY and everything after it
 * renumbers on its own.
 *
 * Matches the home page's service grid, which already labels its three
 * flagship cards 01/02/03 (components/home/ServiceGrid.tsx).
 */
export function categoryNumber(id: string): string {
  const i = DIRECTORY.findIndex((c) => c.id === id);
  return i < 0 ? '' : String(i + 1).padStart(2, '0');
}
