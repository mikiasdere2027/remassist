import { asc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { teamMembers } from '@/db/schema';
import seed from '@/lib/content/seed/content.json';

/**
 * The public team, read from the database.
 *
 * Same shape as lib/faq/content.ts: with DATABASE_URL absent (CI, a local
 * `npm run build`) the seed is served so the homepage still builds and shows
 * the team; with it present the query runs and any error propagates — an
 * editor's change must never be silently undone by a stale fallback.
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
  if (!isDatabaseConfigured()) return fromSeed();

  const db = getDb();
  const rows = await db
    .select()
    .from(teamMembers)
    /* Drafts exist so an editor can prepare a card without it shipping. */
    .where(eq(teamMembers.published, true))
    .orderBy(asc(teamMembers.sortOrder));

  return rows.map((m) => ({
    name: m.name,
    role: m.role,
    initials: m.initials,
    blurb: m.blurb,
    linkedin: m.linkedin,
    image: m.image,
  }));
}