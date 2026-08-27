import Link from 'next/link';
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
 */

const CHECK = <path d="m5 13 4 4L19 7" />;

interface Tier {
  name: string;
  tag: string;
  price: string;
  text: string;
  points: string[];
  /** The Expert card carries the emphasised border. */
  feature?: boolean;
}

const TIERS: Tier[] = [
  {
    name: 'Pro',
    tag: 'Best value',
    price: '$8',
    text: 'Fully trained and fit for work from day one. Pro seats clear our core programme and pick up whatever software you run — CRM, helpdesk, ledger, billing, scheduling, or a tool you built in-house.',
    points: [
      'Works on any stack',
      'Core programme certified before placement',
      'Best rate per seat',
      'Suited to repeatable, rules-based work',
    ],
  },
  {
    name: 'Expert',
    tag: 'Most judgment',
    price: '$11',
    text: 'More years on the job and a far more rigorous assessment path. Experts arrive already fluent in your kind of operation and need the least direction to get moving.',
    points: [
      'Senior experience',
      'Rigorous assessment path',
      'Least supervision needed',
      'Suited to client-facing, high-stakes work',
    ],
    feature: true,
  },
];

/** The two cards on their own, for a page that supplies its own heading. */
export function SeatTiers() {
  return (
    <div className={styles.tiers}>
      {TIERS.map((t) => (
        <div
          className={`${styles.tier}${t.feature ? ` ${styles['tier--expert']}` : ''}`}
          key={t.name}
        >
          <span className={styles.tag}>{t.tag}</span>
          <h3>{t.name}</h3>
          <span className={styles.price}><small>from</small><b>{t.price}</b><em>/hr</em></span>
          <p>{t.text}</p>
          <ul>
            {t.points.map((p) => (
              <li key={p}><svg viewBox="0 0 24 24" aria-hidden="true">{CHECK}</svg><span>{p}</span></li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

interface Props {
  /** Which page surface the section sits on — see .section--white/--paper. */
  surface?: 'white' | 'paper';
}

export default function SeatTiersSection({ surface = 'paper' }: Props) {
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
