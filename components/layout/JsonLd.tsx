import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * Organization + WebSite JSON-LD (§11.1), emitted once from the root layout.
 *
 * Every value here is taken from something the site already states publicly —
 * the footer's contact block and social links. Do not add properties (ratings,
 * founding dates, employee counts, awards) that no page actually claims:
 * structured data asserting more than the site does is exactly what earns a
 * manual action.
 */
const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Rem Assistance Inc.',
  alternateName: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/images/rem-logo.svg`,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    email: 'support@remassistance.com',
    telephone: '+1-832-230-2194',
  },
  sameAs: [
    'https://www.linkedin.com/company/rem-assistance/',
    'https://www.instagram.com/remassist',
    'https://www.youtube.com/@RemAssistant',
  ],
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  publisher: { '@id': `${SITE_URL}/#organization` },
};

export default function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE) }}
      />
    </>
  );
}
