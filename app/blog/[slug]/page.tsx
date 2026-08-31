import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { postBySlug, publishedPosts } from '@/lib/blog/posts';
import { pageOg } from '@/lib/site';
import { BlogPostingJsonLd } from '@/components/layout/JsonLd';
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
    /* pageOg puts back siteName and locale, which declaring an openGraph
       object here had been discarding — see lib/site.ts. `type` and the
       article fields override its website default.

       authors and modifiedTime were both missing: og:article:author is what
       LinkedIn reads for the byline, and without og:article:modified_time a
       re-share of an updated post keeps showing the original date. */
    openGraph: pageOg(`/blog/${post.slug}`, {
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author.name],
      section: post.category,
      /* No per-article image: the one published post's photo is 682x619, and
         both Facebook and LinkedIn demote anything under 1200x630 from a large
         card to a thumbnail — so the site card (1200x630, from pageOg) shares
         better than the article's own art does. Add `images: [post.image]`
         back for any post that ships a large enough asset. */
    }),
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();
  return (
    <>
      <BlogPostingJsonLd post={post} />
      <ArticleBody />
      {/* progress bar, mobile contents drawer, share buttons */}
      <ArticleChrome />
    </>
  );
}
