import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { postBySlug, publishedPosts } from '@/lib/blog/content';
import { cleanHtml } from '@/lib/content/sanitize';
import { parseArticleLayout } from '@/lib/blog/article-layout';
import { getFaqByIds } from '@/lib/faq/content';
import { pageOg } from '@/lib/site';
import { BlogPostingJsonLd } from '@/components/layout/JsonLd';
import ArticleChrome from './ArticleChrome';
import ArticleView from './ArticleView';

/**
 * Blog post route. Statically generated from the published set, so an unwritten
 * or mistyped slug 404s rather than rendering the wrong article — the artboard
 * pointed all four index cards at the same body, which this replaces.
 *
 * Posts are rendered from their stored rich-text body and optional structured
 * article layout, so every public article uses the same CMS-backed template.
 */
export async function generateStaticParams() {
  return (await publishedPosts()).map((p) => ({ slug: p.slug }));
}

/**
 * True, now that posts come from the database.
 *
 * It was false while the post list was a compile-time constant, and that was
 * right then: every slug was known at build time and anything else was a typo.
 * It is wrong now — a post written in the admin is not in the last build's
 * params, so `false` would 404 it until somebody deployed. Unknown slugs still
 * 404, because postBySlug returns null for them and the route calls notFound().
 */
export const dynamicParams = true;

/** A post published in the admin should appear without waiting for a rebuild. */
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await postBySlug(slug);
  if (!found) return {};
  const post = found.post;
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
  const found = await postBySlug(slug);
  if (!found) notFound();
  const { post, body, articleLayout } = found;
  const layout = parseArticleLayout(articleLayout);
  const existingFaq = await getFaqByIds(layout.existingFaqIds ?? []);

  return (
    <>
      <BlogPostingJsonLd post={post} />
      {/* What was here before was `<article className="bk-body">` holding just
          the body HTML — no title, no cover, no byline, and a class with no CSS
          behind it, so every post written in the admin published as unstyled
          text under no headline. ArticleView is that page built from the row.

          The stored markup was sanitized when it was saved; cleanHtml here is a
          second pass, so a row that predates the editor still cannot inject
          anything. It stays on this side of the component because ArticleView
          also renders inside the admin, and sanitize-html is server-only. */}
      <ArticleView
          post={{
            title: post.title,
            excerpt: post.excerpt,
            category: post.category,
            date: post.date,
            readTime: post.readTime,
            image: post.image,
            authorName: post.author.name,
            authorAvatar: post.author.avatar,
          }}
          bodyHtml={cleanHtml(body ?? '')}
          layout={layout}
          existingFaq={existingFaq}
        />
      {/* progress bar, mobile contents drawer, share buttons */}
      <ArticleChrome />
    </>
  );
}
