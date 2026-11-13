import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageOg } from '@/lib/site';
import { getReviews, type ReviewSourceData } from '@/lib/reviews/content';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Reviews',
  description:
    'Every review left on our Trustpilot and Google profiles, shown verbatim and linked to the original so you can verify them yourself.',
  alternates: { canonical: '/reviews' },
  openGraph: pageOg('/reviews'),
};

/**
 * Mirrored reviews — MIGRATION-PLAN §6.5.
 *
 * Real reviews reproduced verbatim, so this page carries the same constraint
 * the `reviews` table will: nothing appears here that is not already public on
 * a profile, every card links back to that profile, and the score shown for a
 * source is the score that source publishes. No hand-set aggregate, and no
 * combined figure across the two either — a number nobody can check is exactly
 * what the §6.5 rule exists to prevent.
 *
 * There is no `AggregateRating` in the JSON-LD for the same reason it is absent
 * from the service pages (components/layout/JsonLd.tsx): self-hosted reviews of
 * your own business are ineligible for review rich results.
 *
 * Reviews and their per-source figures now come from the database and are
 * edited at /admin/content/reviews. Only presentation is left here.
 *
 * Google's profile URL is stored as a CID rather than the /maps/place/… address
 * a browser shows: that path carries coordinates, a zoom level and a session
 * token, none of which survive being pasted anywhere, whereas the CID is the
 * place itself and does not move. Worth knowing before editing it in the admin.
 */

interface Review {
  author: string;
  /** Whatever the source prints under the name — reviewer country, review count. */
  meta: string;
  /** Verbatim as the source states it. Google publishes relative dates only. */
  date: string;
  /** Trustpilot reviews carry a headline of their own. Google reviews do not. */
  headline?: string;
  body: string;
  rating: number;
}

interface Source {
  /** Slug, used to tie each band to its own heading. */
  id: string;
  name: string;
  url: string;
  logo: ReactNode;
  /** The score the source itself publishes, not one computed here. */
  rating: number;
  /** The line beside the score. Each source words it differently, so each says its own. */
  summary: ReactNode;
  reviews: Review[];
  /** Anything the reader needs in order to read the cards correctly. */
  footnote?: string;
  /** Stars take the source's own colour: Trustpilot green, Google amber. */
  tone: 'trustpilot' | 'google';
  /**
   * Whether the logo already spells the name out. Trustpilot's asset is a
   * wordmark, Google's is just the G — so only one of the two tabs needs the
   * name set beside the mark.
   */
  wordmark: boolean;
}

/**
 * Everything about a source that is design rather than content.
 *
 * The logo, the tone colour, the display name and whether the logo already
 * spells that name out are not in the database on purpose: there are two of
 * them, they change roughly never, and an editor wants to fix a footnote or add
 * a review, not swap Trustpilot's wordmark. See db/schema/content.ts.
 */
const PRESENTATION: Record<string, {
  name: string; tone: 'trustpilot' | 'google'; wordmark: boolean; logo: ReactNode;
}> = {
  trustpilot: {
    name: 'Trustpilot',
    tone: 'trustpilot',
    wordmark: true,
    logo: (
      /* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */
      <img className={styles['rv-logo']} src="/images/trustpilot-logo.svg" alt="Trustpilot" width="120" height="32" />
    ),
  },
  google: {
    name: 'Google',
    tone: 'google',
    wordmark: false,
    logo: (
      /* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */
      <img className={styles['rv-logo']} src="/images/google-logo.svg" alt="Google" width="32" height="32" />
    ),
  },
};

/**
 * Join stored figures to that design map.
 *
 * The summary sentence is composed here rather than stored as markup: the
 * database holds a rating label and a count, and this decides how they read.
 * Storing the <b> tags would have made an editor responsible for HTML in
 * order to change a number.
 *
 * Trustpilot deliberately does NOT trust its stored rating label for this
 * line. The label is free text ("Excellent", "5.0", or whatever was typed),
 * and it leaks straight into the sentence — on the live database it read
 * "Rated Based on 3 Reviews - Verified 3 Reviews · based on N reviews". The
 * score and stars already say what the rating is, and the tab pill already
 * counts the reviews, so Trustpilot's line just says the page shows them all.
 * Google keeps the composed wording, where its "5.0" label is a number the
 * reader expects to see spelled out.
 */
function toSources(data: ReviewSourceData[]): Source[] {
  return data.map((s) => {
    const look = PRESENTATION[s.source];
    return {
      id: s.source,
      name: look.name,
      url: s.url,
      tone: look.tone,
      wordmark: look.wordmark,
      logo: look.logo,
      rating: s.stars,
      summary:
        s.source === 'trustpilot' ? (
          <>All reviews, reproduced verbatim</>
        ) : (
          <>
            Rated <b>{s.ratingLabel}</b> · based on <b>{s.reviews.length} reviews</b>
          </>
        ),
      footnote: s.footnote ?? undefined,
      reviews: s.reviews.map((r) => ({
        author: r.author,
        meta: r.meta,
        date: r.dateText,
        headline: r.headline ?? undefined,
        body: r.body,
        rating: r.rating,
      })),
    };
  });
}

const STAR = 'M12 1.5 15 8l7 .8-5.2 4.8 1.4 6.9L12 17l-6.2 3.5 1.4-6.9L2 8.8 9 8z';

function Stars({ rating, tone }: { rating: number; tone: Source['tone'] }) {
  return (
    <span
      className={`${styles['rv-stars']} ${styles[`rv-stars--${tone}`]}`}
      aria-label={`Rated ${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={n <= rating ? undefined : styles['rv-star-empty']}
        >
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
}

function ReviewCard({ review, source }: { review: Review; source: Source }) {
  return (
    <article className={styles['rv-card']}>
      <div className={styles['rv-card-top']}>
        <div>
          <h3 className={styles['rv-name']}>{review.author}</h3>
          <p className={styles['rv-meta']}>{review.meta}</p>
        </div>
        <Stars rating={review.rating} tone={source.tone} />
      </div>
      <p className={styles['rv-date']}>{review.date}</p>
      {review.headline ? <h4 className={styles['rv-title']}>{review.headline}</h4> : null}
      <p className={styles['rv-quote']}>“{review.body}”</p>
      <div className={styles['rv-actions']}>
        <a className={styles['rv-read']} href={source.url} target="_blank" rel="noopener">
          Read on {source.name}
        </a>
      </div>
    </article>
  );
}

/**
 * The source switcher.
 *
 * Radio inputs and `:checked ~` sibling rules rather than state, for the same
 * reason the header's mega panels are pure CSS: this page stays a server
 * component with no client JavaScript, and the switch still works if the bundle
 * never arrives. Radios also come with arrow-key navigation and a group role
 * already built, which a div-and-onClick tablist would have to reimplement.
 *
 * Both panels are in the HTML either way, so a crawler reads every review
 * whichever tab is open.
 */
function ReviewTabs({ sources }: { sources: Source[] }) {
  return (
    <div className={styles['rv-tabs']}>
      {sources.map((source, i) => (
        <input
          key={`radio-${source.id}`}
          className={styles['rv-radio']}
          type="radio"
          name="review-source"
          id={`review-source-${source.id}`}
          defaultChecked={i === 0}
        />
      ))}

      <div className={styles['rv-tablist']} role="group" aria-label="Choose a review source">
        {sources.map((source) => (
          <label key={`tab-${source.id}`} className={styles['rv-tab']} htmlFor={`review-source-${source.id}`}>
            {source.logo}
            {source.wordmark ? null : <span className={styles['rv-tab-name']}>{source.name}</span>}
            <span className={`${styles['rv-tab-score']} ${styles[`rv-stars--${source.tone}`]}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={STAR} />
              </svg>
              {source.rating.toFixed(1)} · {source.reviews.length} reviews
            </span>
          </label>
        ))}
      </div>

      <div className={styles['rv-panels']}>
        {sources.map((source) => (
          <ReviewBand key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
}

function ReviewBand({ source }: { source: Source }) {
  return (
    <section className={styles['rv-band']} aria-labelledby={`${source.id}-heading`}>
      <h2 className={styles['rv-band-title']} id={`${source.id}-heading`}>
        On <span>{source.name}</span>
      </h2>

      <div className={styles['rv-summary']}>
        <div className={styles['rv-summary-left']}>
          {source.logo}
          <div className={styles['rv-score']}>
            <b>{source.rating.toFixed(1)}</b>
            <Stars rating={source.rating} tone={source.tone} />
          </div>
        </div>
        <div className={styles['rv-summary-right']}>
          <p className={styles['rv-note']}>
            {source.summary}
            <br />
            on{' '}
            <a className={styles['rv-note-link']} href={source.url} target="_blank" rel="noopener">
              our live {source.name} profile
            </a>
          </p>
          <a className={styles['rs-btn']} href={source.url} target="_blank" rel="noopener">
            Open {source.name}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>

      <div className={styles['rv-grid']}>
        {source.reviews.map((review) => (
          <ReviewCard key={`${source.id}-${review.author}-${review.date}`} review={review} source={source} />
        ))}
      </div>

      {source.footnote ? <p className={styles['rv-footnote']}>{source.footnote}</p> : null}
    </section>
  );
}

/**
 * Prerendered with an hourly backstop. The backend revalidates the `reviews`
 * tag on every edit, so an edit is visible straight away; this window only
 * covers a missed revalidation call.
 */
export const revalidate = 3600;

export default async function Page() {
  const sources = toSources(await getReviews());

  return (
    <main>
      <section style={{ background: 'linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 70%)' }}>
        <div className={styles['rs-wrap']} style={{ paddingTop: '76px', paddingBottom: '80px' }}>
          <p className={styles['rs-eyebrow']}>Reviews</p>
          <h1 className={styles['rs-h1']}>What clients <span>say about us in public.</span></h1>
          <p className={styles['rs-lede']}>We are reviewed in two places — Trustpilot and Google — and both sets are
            reproduced here verbatim and linked back, so you can check every word against the original.
            Four reviews in total, from three companies: TANO Group left one on each.</p>

          <ReviewTabs sources={sources} />

          <h2 className={styles['rs-verify-title']}>What else you can <span>verify today</span></h2>
          <p className={styles['rs-verify-note']}>Reviews are the loudest signal, but they are not the only one. These three stand up to your own inspection before you spend a minute on a call.</p>

          <div className={styles['rs-verify']}>
            <div className={styles['rs-card']}>
              <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 4 6.5V12c0 4.4 3.2 8 8 9 4.8-1 8-4.6 8-9V6.5z' /><path d='m8.7 12.2 2.3 2.3 4.4-4.7' /></svg></span>
              <h3>Independently audited</h3>
              <p>ISO 9001 quality management and ISO 27001 information security, audited by a third party rather than asserted on a page.</p>
              <span className={styles['rs-iso']}>
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG source. next/image needs the dangerouslyAllowSVG flag to touch one, and has nothing to optimise in a vector: no resize, no format conversion. */}
                <img src='/images/ISO_9001-2015.svg' alt='ISO 9001:2015 certified' />
              </span>
            </div>
            <div className={styles['rs-card']}>
              <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='8' r='3.6' /><path d='M4 20v-1.4A4.6 4.6 0 0 1 8.6 14h6.8a4.6 4.6 0 0 1 4.6 4.6V20' /></svg></span>
              <h3>Meet the actual agents</h3>
              <p>Real profiles at both tiers before anything is signed. Interview them yourself, or approve the shortlist — nobody is assigned to your account without your sign-off.</p>
            </div>
            <div className={styles['rs-card']}>
              <span className={styles['rs-card-ico']}><svg viewBox='0 0 24 24' aria-hidden='true'><rect x='3' y='5' width='18' height='16' rx='2' /><path d='M8 3v4M16 3v4M3 10h18' /><path d='m9.5 15.5 1.8 1.8 3.6-3.8' /></svg></span>
              <h3>Judge the work, not the words</h3>
              <p>A 30—60 day pilot at smaller scale, so you measure our SLAs and quality on your own processes before a full rollout.</p>
            </div>
          </div>

          <div className={styles['rs-alts']}>
            <a className={styles['rs-alt']} href='/faq'><b>FAQ</b><span>Thirty-odd questions answered, including the ones with awkward answers.</span></a>
            <a className={styles['rs-alt']} href='/pricing'><b>Pricing</b><span>Published rates and the monthly grid, so nothing waits on a call.</span></a>
            <a className={styles['rs-alt']} href='/qualify'><b>Qualify in two minutes</b><span>Five questions, then the service line, tier and an estimate.</span></a>
          </div>
        </div>
      </section>
    </main>
  );
}
