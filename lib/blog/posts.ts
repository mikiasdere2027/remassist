/**
 * Blog post index.
 *
 * Phase 03 moves this into Postgres (MIGRATION-PLAN §6). Until then it is the
 * one place that knows which posts exist, so the route, the sitemap and the
 * index cards cannot disagree with each other.
 *
 * `published: false` means the card exists on /blog (its title and excerpt are
 * real, written copy) but no article body has been written yet. Those cards do
 * not link anywhere — the artboard pointed all four at the same article, which
 * would show a reader the wrong post.
 */
export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date — the artboard's display strings are derived from this. */
  date: string;
  readTime: string;
  category: string;
  image: string;
  published: boolean;
  /** Byline, as /blog and the article itself already render it. */
  author: { name: string; avatar: string };
}

export const POSTS: Post[] = [
  {
    slug: 'hiring-offshore-without-losing-quality-control',
    title: 'The 2026 Guide to Hiring Offshore Talent Without Losing Quality Control',
    excerpt:
      'The playbook for scoping a role, vetting candidates, and keeping quality steady once the work is handed over.',
    date: '2026-08-06',
    readTime: '11 min read',
    category: 'Hiring Strategy',
    image: '/images/blog/hiring-offshore.jpg',
    published: true,
    author: { name: 'Johnathan M.', avatar: '/images/teams/Johnathan.jpg' },
  },
  {
    slug: 'role-scorecard-define-a-remote-hire-in-one-page',
    title: 'The Role Scorecard: Define a Remote Hire in One Page',
    excerpt: 'A one-page format for turning a vague headcount request into something a recruiter can act on.',
    date: '2026-08-04',
    readTime: '7 min read',
    category: 'Hiring Strategy',
    image: '/images/blog/role-scorecard.jpg',
    published: false,
    author: { name: 'Kalkidan T.', avatar: '/images/teams/Kalkidan.jpg' },
  },
  {
    slug: 'when-offshore-hiring-is-the-wrong-call',
    title: 'When Offshore Hiring Is the Wrong Call',
    excerpt: 'The cases where an offshore seat costs more than it saves, from the people who staff them.',
    date: '2026-07-30',
    readTime: '6 min read',
    category: 'Cost & ROI',
    image: '/images/blog/cost-roi.jpg',
    published: false,
    author: { name: 'Minassie B.', avatar: '/images/teams/Minassie.jpg' },
  },
  {
    slug: 'first-30-days-onboarding-plan',
    title: 'The First 30 Days: An Onboarding Plan You Can Copy',
    excerpt: 'A week-by-week ramp plan that gets a new remote seat to independent work inside a month.',
    date: '2026-07-25',
    readTime: '9 min read',
    category: 'Team Management',
    image: '/images/blog/onboarding-30-days.jpg',
    published: false,
    author: { name: 'Yonas B.', avatar: '/images/teams/Yonas.jpg' },
  },
];

export const publishedPosts = () => POSTS.filter((p) => p.published);

/**
 * "Kalkidan T., Aug 4, 2026 · 7 min" — the byline the /blog cards render, built
 * from the data so a service page and the blog index cannot drift apart.
 * Dates are formatted in UTC: `date` is a bare ISO day, so a negative-offset
 * server would otherwise render the day before.
 */
export function byline(post: Post) {
  const when = new Date(`${post.date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  return `${post.author.name}, ${when} · ${post.readTime.replace(' read', '')}`;
}

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug && p.published);
