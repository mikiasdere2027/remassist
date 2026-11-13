import { describe, expect, it, vi } from 'vitest';

/* apiPublic is server-only and talks to the backend. Here it records what it
   was asked for and serves the fallback, which is what runs when the backend
   is unreachable. */
const calls: { path: string; tags: string[] }[] = [];

vi.mock('@/lib/api/public', () => ({
  TAGS: { team: 'team' },
  apiPublic: async (path: string, { tags, fallback }: { tags: string[]; fallback: () => unknown }) => {
    calls.push({ path, tags });
    return fallback();
  },
}));

const { getTeamMembers } = await import('./content');

describe('getTeamMembers', () => {
  it('asks /public/team under the team tag', async () => {
    await getTeamMembers();
    expect(calls.at(-1)).toEqual({ path: '/public/team', tags: ['team'] });
  });

  it('falls back to the published seed members with public fields only', async () => {
    const members = await getTeamMembers();
    expect(members.length).toBeGreaterThan(0);
    expect(members[0].name).toBe('Johnathan Zemene');
    for (const m of members) {
      expect(Object.keys(m).sort()).toEqual(
        ['blurb', 'image', 'initials', 'linkedin', 'name', 'role'],
      );
    }
  });
});
