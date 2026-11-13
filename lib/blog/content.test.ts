import { beforeEach, describe, expect, it, vi } from 'vitest';

/* apiPublic is server-only and talks to the backend. Each test decides what
   "the API" answers; `null` means unreachable, so the seed fallback runs. */
const answers = new Map<string, unknown>();
const calls: string[] = [];

vi.mock('@/lib/api/public', () => ({
  TAGS: { posts: 'posts' },
  apiPublic: async (path: string, { fallback }: { fallback: () => unknown }) => {
    calls.push(path);
    const a = answers.get(path);
    return a === undefined || a === null ? fallback() : a;
  },
}));

const { publishedPosts, postBySlug, seedPublishedPosts } = await import('./content');

const LIVE = 'hiring-offshore-without-losing-quality-control';
const DRAFT = 'role-scorecard-define-a-remote-hire-in-one-page';

beforeEach(() => {
  answers.clear();
  calls.length = 0;
});

describe('publishedPosts', () => {
  it('returns what the API answers', async () => {
    const post = { slug: 'x', title: 'X' };
    answers.set('/public/posts', [post]);
    expect(await publishedPosts()).toEqual([post]);
  });

  it('falls back to the published seed posts, in the Post shape', async () => {
    const posts = await publishedPosts();
    expect(posts.map((p) => p.slug)).toEqual([LIVE]);
    expect(posts[0].author).toEqual({ name: 'Johnathan M.', avatar: '/images/teams/Johnathan.jpg' });
    expect(posts.every((p) => p.published)).toBe(true);
  });

  it('sorts the fallback newest first', () => {
    const dates = seedPublishedPosts().map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe('postBySlug', () => {
  it('is null for a slug the published list does not have, without asking for it', async () => {
    answers.set('/public/posts', []);
    expect(await postBySlug(LIVE)).toBeNull();
    expect(calls).toEqual(['/public/posts']);
  });

  it('returns the API detail for a published slug', async () => {
    const detail = { post: { slug: 'x' }, body: '<p>Hi</p>', articleLayout: {}, existingFaq: [] };
    answers.set('/public/posts', [{ slug: 'x' }]);
    answers.set('/public/posts/x', detail);
    expect(await postBySlug('x')).toEqual(detail);
  });

  it('falls back to the seed with the layout parsed', async () => {
    const found = await postBySlug(LIVE);
    expect(found?.post.slug).toBe(LIVE);
    expect(found?.body).toMatch(/^<p>/);
    expect(found?.articleLayout.overview?.title).toBe('At a glance');
    expect(found?.existingFaq).toEqual([]);
  });

  it('never serves an unpublished seed post', async () => {
    expect(await postBySlug(DRAFT)).toBeNull();
  });
});
