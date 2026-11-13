import { describe, expect, it, vi } from 'vitest';

/* apiPublic is server-only and talks to the backend. Here it records what it
   was asked for and serves the fallback, which is what runs when the backend
   is unreachable. */
const calls: { path: string; tags: string[] }[] = [];

vi.mock('@/lib/api/public', () => ({
  TAGS: { reviews: 'reviews' },
  apiPublic: async (path: string, { tags, fallback }: { tags: string[]; fallback: () => unknown }) => {
    calls.push({ path, tags });
    return fallback();
  },
}));

const { getReviews } = await import('./content');

describe('getReviews', () => {
  it('asks /public/reviews under the reviews tag', async () => {
    await getReviews();
    expect(calls.at(-1)).toEqual({ path: '/public/reviews', tags: ['reviews'] });
  });

  it('falls back to the seed: sources in order, published reviews only, public fields only', async () => {
    const sources = await getReviews();
    expect(sources.map((s) => s.source)).toEqual(['trustpilot', 'google']);
    for (const s of sources) {
      expect(s.reviews.length).toBeGreaterThan(0);
      for (const r of s.reviews) {
        expect(Object.keys(r).sort()).toEqual(
          ['author', 'body', 'dateText', 'headline', 'meta', 'rating'],
        );
      }
    }
  });
});
