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
}

export const POSTS: Post[] = [
  {
    slug: 'hiring-offshore-without-losing-quality-control',
    title: 'The 2026 Guide to Hiring Offshore Talent Without Losing Quality Control',
    excerpt:
      'The playbook for scoping a role, vetting candidates, and keeping quality steady once the work is handed over.',
    date: '2026-02-18',
    readTime: '11 min read',
    category: 'Hiring',
    image: '/images/blog/hiring-offshore.jpg',
    published: true,
  },
  {
    slug: 'role-scorecard-define-a-remote-hire-in-one-page',
    title: 'The Role Scorecard: Define a Remote Hire in One Page',
    excerpt: 'A one-page format for turning a vague headcount request into something a recruiter can act on.',
    date: '2026-01-29',
    readTime: '7 min read',
    category: 'Hiring',
    image: '/images/blog/role-scorecard.jpg',
    published: false,
  },
  {
    slug: 'when-offshore-hiring-is-the-wrong-call',
    title: 'When Offshore Hiring Is the Wrong Call',
    excerpt: 'The cases where an offshore seat costs more than it saves, from the people who staff them.',
    date: '2026-01-14',
    readTime: '6 min read',
    category: 'Strategy',
    image: '/images/blog/cost-roi.jpg',
    published: false,
  },
  {
    slug: 'first-30-days-onboarding-plan',
    title: 'The First 30 Days: An Onboarding Plan You Can Copy',
    excerpt: 'A week-by-week ramp plan that gets a new remote seat to independent work inside a month.',
    date: '2025-12-11',
    readTime: '9 min read',
    category: 'Onboarding',
    image: '/images/blog/onboarding-30-days.jpg',
    published: false,
  },
];

export const publishedPosts = () => POSTS.filter((p) => p.published);

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug && p.published);
