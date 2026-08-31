import Link from 'next/link';
import { relatedServices } from '@/lib/services';
import { ServiceJsonLd } from '@/components/layout/JsonLd';
import styles from './RelatedServices.module.css';

/**
 * The cross-link band every service page ends on, above its closing CTA.
 *
 * Two problems, one component. Six of the twelve service pages linked to no
 * other service, and six linked to /qualify from nowhere — so a crawler (or a
 * reader) landing on one of them had no route to the rest of the section, and
 * the estimate tool was an orphan from most of it. Rendering it from
 * lib/services.ts rather than hand-writing twelve variants is also what keeps
 * the wording for a given service identical wherever it is linked from.
 *
 * It emits this page's `Service` and `BreadcrumbList` JSON-LD too. That is not
 * decoration on the component's part: the same lib/services.ts record supplies
 * both the visible links and the graph, so the two cannot describe the service
 * differently.
 *
 * Server component — no client JS.
 *
 * `surface` matches the closing section it sits above: the band alternates
 * white and paper down the page, and the wrong one puts two same-coloured
 * sections back to back with only a hairline between them.
 */
export default function RelatedServices({
  path,
  surface = 'paper',
}: {
  path: string;
  surface?: 'paper' | 'white';
}) {
  const related = relatedServices(path);
  if (!related.length) return null;

  return (
    <section className={`${styles.section} ${surface === 'white' ? styles['section--white'] : ''}`}>
      <ServiceJsonLd path={path} />
      <div className={styles.wrap}>
        <span className={styles.kicker}>Keep looking</span>
        <h2 className={styles.h2}>
          Seats that <span>work alongside this one.</span>
        </h2>

        <div className={styles.grid}>
          {related.map((s) => (
            <Link key={s.path} href={s.path} className={styles.card}>
              <span className={styles.name}>
                {s.name}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </span>
              <p className={styles.blurb}>{s.blurb}</p>
            </Link>
          ))}
        </div>

        <p className={styles.foot}>
          <span>Not sure which of these you need?</span>
          <Link href="/qualify" className={styles.quiz}>
            Answer five questions and get an estimate
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
        </p>
      </div>
    </section>
  );
}
