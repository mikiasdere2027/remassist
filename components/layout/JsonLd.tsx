import { SITE_NAME, SITE_URL } from '@/lib/site';
import { serviceByPath } from '@/lib/services';
import type { Post } from '@/lib/blog/posts';

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

/** One <script type="application/ld+json"> — the only place that stringifies. */
function Graph({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * BreadcrumbList (§11.1). Google renders this as the path shown in place of
 * the raw URL in a result, and it is the one structured-data type on this site
 * that changes what a searcher actually sees.
 *
 * `trail` is the ancestors only, in order, without the current page — the last
 * item is appended here from `name`, and deliberately carries no `item`: the
 * page you are on is not a link to somewhere else.
 */
export function Breadcrumbs({
  trail,
  name,
}: {
  trail: { name: string; path: string }[];
  name: string;
}) {
  const items = [
    { name: 'Home', path: '/' },
    ...trail,
  ].map((entry, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: entry.name,
    item: `${SITE_URL}${entry.path === '/' ? '' : entry.path}`,
  }));
  items.push({ '@type': 'ListItem', position: items.length + 1, name } as (typeof items)[number]);

  return (
    <Graph
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items,
      }}
    />
  );
}

/**
 * Service (§11.1), for the twelve service pages, plus the breadcrumb trail
 * that goes with them.
 *
 * There is no /services index route, so the trail is Home > <service> rather
 * than inventing a middle crumb that would 404 when clicked.
 *
 * Everything asserted here is read from lib/services.ts, which copies the
 * page's own metadata.description verbatim. No `offers`, no `aggregateRating`:
 * self-hosted reviews of your own business are ineligible for review rich
 * results, and the rates on /pricing are per-seat ranges that an `offers`
 * block would state more precisely than the page does.
 */
export function ServiceJsonLd({ path }: { path: string }) {
  const service = serviceByPath(path);
  if (!service) return null;
  const url = `${SITE_URL}${path}`;
  return (
    <>
      <Graph
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          '@id': `${url}#service`,
          name: service.name,
          description: service.description,
          url,
          serviceType: service.name,
          provider: { '@id': `${SITE_URL}/#organization` },
          areaServed: 'Worldwide',
        }}
      />
      <Breadcrumbs trail={[]} name={service.name} />
    </>
  );
}

/**
 * BlogPosting for the article route, with its breadcrumb trail.
 *
 * `dateModified` falls back to the publication date rather than to "now":
 * a build-time timestamp would tell Google the article changes on every
 * deploy, which is both false and the kind of freshness signal that gets
 * discounted once it is disbelieved.
 */
export function BlogPostingJsonLd({ post }: { post: Post }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return (
    <>
      <Graph
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `${url}#article`,
          headline: post.title,
          description: post.excerpt,
          url,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          image: `${SITE_URL}${post.image}`,
          datePublished: post.date,
          dateModified: post.updated ?? post.date,
          articleSection: post.category,
          author: { '@type': 'Person', name: post.author.name },
          publisher: { '@id': `${SITE_URL}/#organization` },
        }}
      />
      <Breadcrumbs trail={[{ name: 'Blog & Guides', path: '/blog' }]} name={post.title} />
    </>
  );
}

export default function JsonLd() {
  return (
    <>
      <Graph data={ORGANIZATION} />
      <Graph data={WEBSITE} />
    </>
  );
}
