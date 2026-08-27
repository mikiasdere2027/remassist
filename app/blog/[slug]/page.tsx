import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { postBySlug, publishedPosts } from '@/lib/blog/posts';
import ArticleBody from './ArticleBody';
import ArticleChrome from './ArticleChrome';

/**
 * Blog post route. Statically generated from the published set, so an unwritten
 * or mistyped slug 404s rather than rendering the wrong article — the artboard
 * pointed all four index cards at the same body, which this replaces.
 *
 * Only one article has a body today (see ArticleBody). When Phase 03 moves
 * posts into Postgres, this route keeps its shape: swap postBySlug/publishedPosts
 * for queries and render the stored body.
 */
export function generateStaticParams() {
  return publishedPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      url: `/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      images: [post.image],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!postBySlug(slug)) notFound();
  return (
    <>
      <ArticleBody />
      {/* progress bar, mobile contents drawer, share buttons */}
      <ArticleChrome />
    </>
  );
}
