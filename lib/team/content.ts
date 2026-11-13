import { apiPublic, TAGS } from '@/lib/api/public';
import seed from '@/lib/content/seed/content.json';

/**
 * The public team (published members, homepage order), from the backend
 * (GET /v1/public/team). Cached under the `team` tag, which the backend
 * revalidates on every edit. If the backend can't be reached the bundled seed
 * is served instead (see lib/api/public.ts).
 */

export interface PublicTeamMember {
  name: string;
  role: string;
  initials: string;
  blurb: string | null;
  linkedin: string | null;
  image: string | null;
}

function fromSeed(): PublicTeamMember[] {
  return [...seed.teamMembers]
    .filter((m) => m.published)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => ({
      name: m.name,
      role: m.role,
      initials: m.initials,
      blurb: m.blurb,
      linkedin: m.linkedin,
      image: m.image,
    }));
}

export async function getTeamMembers(): Promise<PublicTeamMember[]> {
  return apiPublic<PublicTeamMember[]>('/public/team', {
    tags: [TAGS.team],
    fallback: fromSeed,
  });
}
