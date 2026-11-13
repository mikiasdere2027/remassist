import Image from 'next/image';
import Link from 'next/link';
import { formatPostDate } from '@/lib/blog/display';
import type { ArticleLayout } from '@/lib/blog/article-layout';
import { answerHtml } from '@/lib/content/sanitize';
import styles from './page.module.css';

/**
 * One article, rendered the way visitors see it.
 *
 * This exists because a post written in the admin used to publish as nothing
 * but its stored body: the route rendered `<article className="bk-body">` with
 * the HTML inside it and no title, cover, byline or date — and `bk-body` had
 * no styles anywhere in the repo, so the words came out at browser defaults.
 * The whole article design was in ArticleBody.tsx, hard-coded around the one
 * imported article, where nothing written since could reach it.
 *
 * So the design moved here, off that one post's content and onto any row: the
 * same `bp-*` classes from page.module.css, driven by the record. The stored
 * body goes inside `.bp-prose`, whose rules are element selectors (`p`, `h2`,
 * `ul`, `blockquote`) — exactly the tags lib/content/sanitize.ts lets through
 * — so editor output picks up the article's typography without the editor
 * having to emit class names.
 *
 * The admin's Preview renders this same component from the form's current
 * values, which is the point: a preview built from a second, prettier template
 * would be a promise the published page does not keep.
 *
 * `preview` covers the two differences a modal needs. Images are unoptimised,
 * because a cover chosen a moment ago is a `blob:` URL the optimiser cannot
 * fetch; and the breadcrumb and category stop being links, because navigating
 * away is not what clicking inside a preview should do.
 */

export type ArticleViewPost = {
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  authorName: string;
  authorAvatar: string;
};

export default function ArticleView({
  post,
  bodyHtml,
  layout = {},
  existingFaq = [],
  preview = false,
}: {
  post: ArticleViewPost;
  /** Sanitized HTML. The caller owns that — see the note in page.tsx. */
  bodyHtml: string;
  layout?: ArticleLayout;
  /** Central FAQ entries the article embeds; answers are sanitised HTML. */
  existingFaq?: Array<{ question: string; answer: string }>;
  preview?: boolean;
}) {
  const headings = headingsFrom(bodyHtml);
  const articleHtml = addHeadingIds(bodyHtml, headings);
  return (
    <>
      <div className={styles['bp-progress']} id="bpProgress" aria-hidden="true" />
      <section className={styles['bp-hero-band']}>
        <div className={styles['bp-wrap']}>
          <nav className={styles['bp-breadcrumb']} aria-label="Breadcrumb">
            {preview ? (
              <>
                <span>Home</span>
                <span>/</span>
                <span>Resources</span>
                <span>/</span>
              </>
            ) : (
              <>
                <Link href="/">Home</Link>
                <span>/</span>
                <Link href="/blog">Resources</Link>
                <span>/</span>
              </>
            )}
            <b>{post.title || 'Untitled'}</b>
          </nav>

          <article className={styles['bp-hero-card']}>
            <div className={styles['bp-hero-inner']}>
              {post.category && (
                <div className={styles['bp-kicker']}>
                  <span className={styles['bp-type']}>{post.category}</span>
                </div>
              )}

              <h1 className={styles['bp-h1']}>{post.title || 'Untitled'}</h1>

              {post.excerpt && <p className={styles['bp-deck']}>{post.excerpt}</p>}

              <div className={styles['bp-byline']}>
                {post.authorAvatar && (
                  <Image
                    className={styles['bp-avatar']}
                    src={post.authorAvatar}
                    alt=""
                    width={96}
                    height={96}
                    sizes="46px"
                    unoptimized={preview}
                  />
                )}
                {post.authorName && (
                  <div>
                    <div className={styles['bp-who']}>{post.authorName}</div>
                  </div>
                )}
                {post.date && (
                  <>
                    {post.authorName && <span className={styles['bp-dot']} />}
                    <span className={styles['bp-when']}>{formatPostDate(post.date)}</span>
                  </>
                )}
                {post.readTime && (
                  <>
                    <span className={styles['bp-dot']} />
                    <span className={styles['bp-when']}>{post.readTime}</span>
                  </>
                )}
              </div>
            </div>

            {post.image && (
              <div className={styles['bp-figure']}>
                <Image
                  className={styles['bp-figure-pic']}
                  src={post.image}
                  alt=""
                  fill
                  sizes="(max-width: 1120px) 100vw, 1120px"
                  unoptimized={preview}
                />
              </div>
            )}
          </article>
        </div>
      </section>

      <section className={styles['bp-post-body']}>
        <div className={styles['bp-wrap']}>
          <div className={styles['bp-layout']}>
          {headings.length ? <aside className={styles['bp-toc']} id="bpToc"><button className={styles['bp-toc-toggle']} id="bpTocToggle" type="button" aria-expanded="false">In this article</button><div className={styles['bp-toc-panel']}><h4>In this article</h4><ol id="bpTocList">{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></div></aside> : null}
          <div className={styles['bp-article']}>
            <div
              className={styles['bp-prose']}
            >
              {layout.overview?.items?.length ? <div className={styles['bp-glance']}><h4>{layout.overview.title || 'At a glance'}</h4><ul>{layout.overview.items.map((item, i) => <li key={i}><Check />{item}</li>)}</ul></div> : null}
              <div dangerouslySetInnerHTML={{ __html: articleHtml }} />
              {layout.checklist?.items?.length ? <div className={styles['bp-ask']}><h4><Question />{layout.checklist.title}</h4><ol>{layout.checklist.items.map((item, i) => <li key={i}>{item}</li>)}</ol></div> : null}
              {layout.quote?.text ? <blockquote>{layout.quote.text}{layout.quote.attribution ? <cite>— {layout.quote.attribution}</cite> : null}</blockquote> : null}
              {layout.kpis?.length ? <div className={styles['bp-stats']}>{layout.kpis.map((item, i) => <div key={i}><b>{item.value}</b><span>{item.label}</span></div>)}</div> : null}
              {layout.cta?.title ? <div className={styles['bp-inline-cta']}><h3>{layout.cta.title}</h3>{layout.cta.text ? <p>{layout.cta.text}</p> : null}<div className={styles['bp-cta-actions']}>{layout.cta.primaryLabel && layout.cta.primaryHref ? <a className={`${styles['bp-btn']} ${styles['bp-btn--primary']}`} href={layout.cta.primaryHref}>{layout.cta.primaryLabel}</a> : null}{layout.cta.secondaryLabel && layout.cta.secondaryHref ? <a className={`${styles['bp-btn']} ${styles['bp-btn--light']}`} href={layout.cta.secondaryHref}>{layout.cta.secondaryLabel}</a> : null}</div></div> : null}
              {(layout.faq?.length || existingFaq.length) ? <section className={styles['bp-faq']}><h2>Frequently asked questions</h2><div className={styles['bp-faq-list']}>{[...(layout.faq ?? []).map((item) => ({ ...item, answer: answerHtml(item.answer) })), ...existingFaq].map((item, i) => <details className={styles['bp-faq-item']} key={`${item.question}-${i}`} open={i === 0}><summary>{item.question}</summary><div className={styles['bp-faq-a']} dangerouslySetInnerHTML={{ __html: item.answer }} /></details>)}</div></section> : null}
              {layout.sources?.length ? <div className={styles['bp-sources']}><h4>Sources &amp; further reading</h4><ol>{layout.sources.map((source, i) => <li key={i}>{source.href ? <a href={source.href} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>)}</ol></div> : null}
              {layout.tags?.length ? <div className={styles['bp-tags']}><span className={styles['bp-label']}>Filed under</span>{layout.tags.map((tag) => <Link href={`/blog?category=${encodeURIComponent(tag)}`} key={tag}>{tag}</Link>)}</div> : null}
              {layout.author?.bio ? <div className={styles['bp-author']}>{post.authorAvatar ? <Image src={post.authorAvatar} alt="" width={96} height={96} sizes="74px" /> : null}<div className={styles['bp-a-body']}><h4>{post.authorName}</h4>{layout.author.role ? <div className={styles['bp-a-role']}>{layout.author.role}</div> : null}<p>{layout.author.bio}</p>{layout.author.moreLabel && layout.author.moreHref ? <div className={styles['bp-a-links']}><Link className={`${styles['bp-btn']} ${styles['bp-btn--secondary']}`} href={layout.author.moreHref}>{layout.author.moreLabel}</Link></div> : null}</div></div> : null}
            </div>
          </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Check() { return <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#0085fe" /><path d="M6 10.2l2.6 2.6L14 7.4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>; }
function Question() { return <svg viewBox="0 0 24 24" aria-hidden="true" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.6.2-1 .8-1 1.4v.4" /><line x1="12" y1="17" x2="12" y2="17.01" /></svg>; }

function headingsFrom(html: string) {
  const used = new Map<string, number>();
  return [...html.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/gi)].map((match) => {
    const text = match[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    const base = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'section';
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    return { text, id: count ? `${base}-${count + 1}` : base };
  });
}

function addHeadingIds(html: string, headings: Array<{ id: string }>) {
  let index = 0;
  return html.replace(/<h2(?:\s[^>]*)?>/gi, () => `<h2 id="${headings[index++]?.id ?? 'section'}">`);
}
