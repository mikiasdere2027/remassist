import type { ComponentProps } from 'react';
import { publishedPosts } from '@/lib/blog/content';
import BlogRailView from './BlogRailView';

/**
 * BlogRail — "from the blog" on a service page, with the published posts from
 * the backend API (cached under the `posts` tag, seed fallback when the API is
 * down). The rail itself is the client component BlogRailView.
 *
 * Only published posts: the old hardcoded list also showed unwritten ones as
 * "Coming soon" cards, which the API does not expose. With no published posts
 * the section is left out rather than shown empty.
 */
export default async function BlogRail(props: Omit<ComponentProps<typeof BlogRailView>, 'posts'>) {
  const posts = await publishedPosts();
  if (posts.length === 0) return null;
  return <BlogRailView {...props} posts={posts} />;
}
