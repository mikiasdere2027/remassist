import type { Metadata } from 'next';
import Image from 'next/image';
import { pageOg } from '@/lib/site';
import { publishedPosts } from '@/lib/blog/content';
import { formatPostDate } from '@/lib/blog/display';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Blog & Guides',
  description:
    'Hiring guides, cost breakdowns and operating templates from the team that sources, onboards and manages dedicated remote staff.',
  alternates: { canonical: '/blog' },
  openGraph: pageOg('/blog'),
};

/**
 * The index, from the database.
 *
 * It only lists PUBLISHED posts. It used to carry three hand-written cards for
 * articles that were never written, each wearing a "Coming soon" badge — which
 * read as a content calendar the site was not keeping. Publishing a post in the
 * admin is now the only way it appears here, so the page cannot promise
 * something that does not exist.
 *
 * The consequence, today, is that "Latest resources" is empty: one of four
 * posts is published and it is the featured one. That is the honest state, and
 * flipping `published` on a post with a body fills the grid.
 *
 * Note the copy on the featured card now comes from the post record rather than
 * from the artboard, so its headline and description are the post's own title
 * and excerpt. They differed before — the card said "Hiring Offshore Without"
 * where the post says "Hiring Offshore Talent Without" — and one of them had to
 * win. The record wins, because that is what the article page, the metadata and
 * the JSON-LD already use.
 */
export const revalidate = 3600;

/* The grid's three thumbnail gradients, cycled so any number of posts renders. */
const GRADIENTS = ['g1', 'g2', 'g3'] as const;

export default async function Page() {
  const posts = await publishedPosts();
  const [featured, ...rest] = posts;

  return (
    <main>
      <section className={styles['bk-hero-band']}>
        <div className={styles['bk-wrap']}>
          <div className={styles['bk-hero-card']}>
            <div>
              <span className={styles['bk-eyebrow']}>REM Resources</span>
              <h1 className={styles['bk-h1']}>
                Playbooks for building a remote team that{' '}
                <span className={styles['hl']}>actually delivers.</span>
              </h1>
              <p className={styles['bk-lede']}>Hiring guides, cost breakdowns and operating templates
                from the team that sources, onboards and manages dedicated remote staff every day.</p>
            </div>

            {featured && (
              <a href={`/blog/${featured.slug}`} className={styles['bk-featured']}>
                <div className={styles['bk-thumb']}>
                  <span className={styles['bk-badge']}>Featured</span>
                  <Image
                    className={styles['bk-thumb-pic']}
                    src={featured.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 100vw, 500px"
                    style={{ objectPosition: '50% 18%' }}
                  />
                </div>
                <div className={styles['bk-featured-body']}>
                  <div className={styles['bk-topic']}>{featured.category}</div>
                  <h3>{featured.title}</h3>
                  <p>{featured.excerpt}</p>
                  <div className={styles['bk-meta']}>
                    <Image src={featured.author.avatar} alt="" width={96} height={96} sizes="36px" />
                    <div>
                      <div className={styles['who']}>{featured.author.name}</div>
                      <div className={styles['when']}>
                        {formatPostDate(featured.date)} · {featured.readTime}
                      </div>
                    </div>
                    <span className={styles['read']}>
                      Read more
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            )}
          </div>
        </div>
      </section>

      <section className={styles['bk-band']}>
        <div className={styles['bk-wrap']}>
          <div className={styles['bk-head']}>
            <h2>Latest resources</h2>
            <p>
              {rest.length === 0
                ? 'More guides are being written'
                : `${rest.length} more ${rest.length === 1 ? 'guide' : 'guides'} to read`}
            </p>
          </div>

          {rest.length === 0 ? (
            /* An honest empty state rather than cards for articles that do not
               exist. It says what is true and does not imply a date. */
            <p className={styles['bk-empty']}>
              Nothing else is published yet. The featured guide above is the one to start with.
            </p>
          ) : (
            <div className={styles['bk-grid']}>
              {rest.map((p, i) => (
                <a className={styles['bk-card']} key={p.slug} href={`/blog/${p.slug}`}>
                  <div className={`${styles['bk-thumb-sm']} ${styles[GRADIENTS[i % GRADIENTS.length]]}`}>
                    <Image
                      className={styles['bk-thumb-pic']}
                      src={p.image}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 100vw, 380px"
                    />
                    <span className={styles['bk-type']}>{p.category}</span>
                  </div>
                  <div className={styles['bk-card-body']}>
                    <div className={styles['bk-topic']}>{p.category}</div>
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                    <div className={styles['bk-meta']}>
                      <Image src={p.author.avatar} alt="" width={96} height={96} sizes="36px" />
                      <div>
                        <div className={styles['who']}>{p.author.name}</div>
                        <div className={styles['when']}>
                          {formatPostDate(p.date)} · {p.readTime}
                        </div>
                      </div>
                      <span className={styles['read']}>Read more</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
