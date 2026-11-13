import Link from 'next/link';
import { getPublishedTiers } from '@/lib/rates/getPublishedTiers';
import styles from './SeatTiers.module.css';

/**
 * SeatTiers — the published Pro and Expert seat rates.
 *
 * The site shows the two tiers two ways and only two: the home page's photo
 * plates (components/home/TiersSection), and this card — /pricing's treatment,
 * which every other page shares. Before this, five service pages each carried
 * their own copy of the block under their own class prefix, so the same two
 * rates were stated five different ways and drifted apart with every edit.
 *
 * The copy is deliberately service-neutral. The rates, the vetting and the
 * controls are identical wherever the seat sits; the page around the section is
 * what makes it specific, which is why nothing here takes a per-page prop.
 *
 * `SeatTiers` is the bare card grid, for /pricing's hero, which brings its own
 * heading and closing line. The default export is the whole section, which is
 * what the service pages drop in.
 *
 * Price figures come from the backend via getPublishedTiers() (cache tag
 * `pricing`), so an admin edit on /admin/catalog is reflected here once the
 * backend revalidates. Falls back to seed values if the API is unreachable.
 */

const CHECK = <path d="m5 13 4 4L19 7" />;

/** Per-tier static copy — the price figure is the only thing that changes. */
const TIER_COPY: Record<string, {
  tag: string;
  text: string;
  points: string[];
  feature?: boolean;
}> = {
  pro: {
    tag: 'Best value',
    text: 'Fully trained and fit for work from day one. Pro seats clear our core programme and pick up whatever software you run — CRM, helpdesk, ledger, billing, scheduling, or a tool you built in-house.',
    points: [
      'Works on any stack',
      'Core programme certified before placement',
      'Best rate per seat',
      'Suited to repeatable, rules-based work',
    ],
  },
  expert: {
    tag: 'Most judgment',
    text: 'More years on the job and a far more rigorous assessment path. Experts arrive already fluent in your kind of operation and need the least direction to get moving.',
    points: [
      'Senior experience',
      'Rigorous assessment path',
      'Least supervision needed',
      'Suited to client-facing, high-stakes work',
    ],
    feature: true,
  },
};

/** The two cards on their own, for a page that supplies its own heading. */
export async function SeatTiers() {
  /* Only tiers this file has copy for. A card is an argument — a paragraph
     saying what the seat is and four points saying what it suits — and none of
     that can be derived from a rate row, so a tier with no entry in TIER_COPY
     renders as a heading, a price and then nothing. That is not hypothetical:
     a third tier added in /admin/catalog put a blank card on /pricing and on
     every service page, under headings that say "Two tiers" and "Two rates,
     published". Adding a third tier to the site therefore means adding its
     copy here, deliberately, rather than a rate row quietly becoming a card.

     Rates still come from the database — this filters which tiers are shown,
     never what they cost. Object.hasOwn, not `in`: `in` would say yes to
     'constructor' and every other name on the prototype. */
  const tiers = (await getPublishedTiers()).filter((t) => Object.hasOwn(TIER_COPY, t.key));

  return (
    <div className={styles.tiers}>
      {tiers.map((t) => {
        const copy = TIER_COPY[t.key];
        return (
          <div
            className={`${styles.tier}${copy.feature ? ` ${styles['tier--expert']}` : ''}`}
            key={t.key}
          >
            <span className={styles.tag}>{copy.tag}</span>
            <h3>{t.label}</h3>
            <span className={styles.price}><small>from</small><b>{t.priceDisplay}</b><em>/hr</em></span>
            <p>{copy.text}</p>
            <ul>
              {copy.points.map((p) => (
                <li key={p}><svg viewBox="0 0 24 24" aria-hidden="true">{CHECK}</svg><span>{p}</span></li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  /** Which page surface the section sits on — see .section--white/--paper. */
  surface?: 'white' | 'paper';
}

export default async function SeatTiersSection({ surface = 'paper' }: Props) {
  return (
    <section className={`${styles.section} ${styles[`section--${surface}`]}`} id="rates">
      <div className={styles.wrap}>
        <span className={styles.kicker}>What a seat costs</span>
        <h2 className={styles.h2}>Two tiers, <span>same controls.</span></h2>
        <p className={styles.lede}>Published, hourly, per seat — the same two rates on every service line.
          Every seat operates under the same ISO 9001 quality and ISO 27001 security controls. What
          changes is the experience in the seat and how much direction it needs.</p>

        <SeatTiers />

        <p className={styles.note}>A pod can mix tiers — an Expert lead with Pro seats underneath is the most common shape we
          place, and the cheapest way to buy senior judgment. Coverage drives the monthly cost far more
          than seniority does: see the <Link href="/pricing">full pricing grid</Link>.</p>
      </div>
    </section>
  );
}
