import { asc, desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { posts, teamMembers } from '@/db/schema';

/**
 * Who can be named as a post's author: the team, and only the team.
 *
 * The author used to be a free text field beside a second free text field for
 * the avatar path — two chances to typo a byline, and no way to tell that
 * "Johnathan M." and "Johnathan M" are the same person. It is a closed list
 * now, and picking a name is also what sets the headshot, so the byline on the
 * blog is always a real member of the team as the Team screen has them.
 *
 * Recently published authors come first. Somebody writing several posts in a
 * row should not scroll past the whole team every time, and whoever wrote the
 * last post is overwhelmingly the likeliest author of the next one.
 *
 * Unpublished members are left out: they are not people the site is currently
 * willing to show, and a byline is a place it shows them.
 */

export type AuthorOption = {
  name: string;
  /** Their role, for the option label. */
  role: string;
  /** Their headshot, applied to the post when they are picked. */
  avatar: string | null;
};

/** Enough recent posts to tell who has been writing lately. */
const RECENT_POSTS = 50;

export async function authorOptions(): Promise<AuthorOption[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();

  const [members, recentPosts] = await Promise.all([
    db
      .select({ name: teamMembers.name, role: teamMembers.role, image: teamMembers.image })
      .from(teamMembers)
      .where(eq(teamMembers.published, true))
      .orderBy(asc(teamMembers.sortOrder)),
    db
      .select({ name: posts.authorName, avatar: posts.authorAvatar })
      .from(posts)
      .orderBy(desc(posts.updatedAt))
      .limit(RECENT_POSTS),
  ]);

  const options: AuthorOption[] = [];
  const taken = new Set<string>();

  /* Recent first, then the rest of the team in its own order. A post's stored
     author is matched by name and by headshot, because the four imported posts
     carry a short byline ("Johnathan M.") against the full team name — see
     the note in PostForm about what the editor does with that. */
  for (const post of recentPosts) {
    const member = members.find(
      (m) =>
        m.name === post.name.trim() ||
        (Boolean(m.image) && m.image === post.avatar.trim()),
    );
    if (!member || taken.has(member.name)) continue;
    taken.add(member.name);
    options.push({ name: member.name, role: member.role, avatar: member.image });
  }

  for (const member of members) {
    if (taken.has(member.name)) continue;
    taken.add(member.name);
    options.push({ name: member.name, role: member.role, avatar: member.image });
  }

  return options;
}
