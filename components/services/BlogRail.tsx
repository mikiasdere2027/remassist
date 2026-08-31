'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { byline, POSTS } from '@/lib/blog/posts';
import styles from './BlogRail.module.css';
import { useRail } from './useRail';

/**
 * BlogRail — "from the blog" on a service page.
 *
 * Split cards: the topic tag, the title and the byline on the left; the
 * article's photograph on the right, carrying the read affordance where the
 * reference design puts a client logo. Posts that have no body yet show
 * "Coming soon" and do not link — the same rule /blog follows, so a service
 * page never offers an article that does not exist.
 */
interface Props {
  eyebrow: string;
  title: ReactNode;
  lede: string;
  /** Which page surface the section sits on — see .section--white/--paper. */
  surface: 'white' | 'paper';
}

export default function BlogRail({ eyebrow, title, lede, surface }: Props) {
  const { railRef, progressRef, onScroll, nudge } = useRail({ cardWidth: 470 });

  return (
    <section className={`${styles.section} ${styles[`section--${surface}`]}`} id="from-the-blog">
      <div className={styles.wrap}>
        <div className={styles.head}>
          <div>
            <span className={styles.kicker}>{eyebrow}</span>
            <h2 className={styles.h2}>{title}</h2>
            <p className={styles.lede}>{lede}</p>
          </div>
          <Link className={styles.all} href="/blog">
            Browse all guides
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
        </div>

        <div className={styles.rail} ref={railRef} onScroll={onScroll}>
          {POSTS.map((post) => {
            const inner = (
              <>
                <div className={styles.body}>
                  <span className={styles.tag}>{post.category}</span>
                  <h3 className={styles.title}>{post.title}</h3>
                  <div className={styles.byline}>
                    <span className={styles.avatar}>
                      <Image src={post.author.avatar} alt="" width={96} height={96} sizes="30px" />
                    </span>
                    <p className={styles.who}>{byline(post)}</p>
                  </div>
                </div>
                <div className={styles.shot}>
                  <Image src={post.image} alt="" fill sizes="194px" />
                  {post.published ? (
                    <span className={styles.read}>
                      Read
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                    </span>
                  ) : (
                    <span className={styles.soon}>Coming soon</span>
                  )}
                </div>
              </>
            );

            return post.published ? (
              <Link className={styles.card} href={`/blog/${post.slug}`} key={post.slug}>
                {inner}
              </Link>
            ) : (
              <article className={`${styles.card} ${styles['card--soon']}`} key={post.slug}>
                {inner}
              </article>
            );
          })}
        </div>

        <div className={styles.controls}>
          <div className={styles.progress}>
            <span className={styles.progressFill} ref={progressRef} style={{ width: '8%' }} />
          </div>
          <button type="button" className={styles.arrow} onClick={() => nudge(-1)} aria-label="Scroll articles left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M19 12H5m6 6-6-6 6-6" /></svg>
          </button>
          <button type="button" className={styles.arrow} onClick={() => nudge(1)} aria-label="Scroll articles right">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
