import type { Metadata } from 'next';
import { pageOg } from '@/lib/site';
import { getFaq } from '@/lib/faq/content';
import FaqTabs from './FaqTabs';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'The questions from every service page, collected and answered in one place — including the ones with awkward answers.',
  alternates: { canonical: '/faq' },
  openGraph: pageOg('/faq'),
};

/**
 * Revalidated rather than dynamic.
 *
 * This is a marketing page and it should stay prerendered; the editors call
 * revalidatePath('/faq') on every write, so an edit is visible immediately
 * rather than after this window. The hourly figure is only the backstop for a
 * change made straight in the database, bypassing the admin.
 */
export const revalidate = 3600;

export default async function Page() {
  const groups = await getFaq();

  return (
    <main>
      <section style={{ background: "linear-gradient(180deg,#f7faff 0%,var(--bg-marketing-paper) 72%)" }}>
        <div className={styles['rs-wrap']} style={{ paddingTop: "76px", paddingBottom: "44px" }}>
          <p className={styles['rs-eyebrow']}>FAQ</p>
          <h1 className={styles['rs-h1']}>Everything we get <span>asked, in one place.</span></h1>
          <p className={styles['rs-lede']}>The questions from every service page, collected and answered here —
            including the ones with awkward answers. Pick a topic on the left, or jump straight to a group
            by its link on the page it came from.</p>
        </div>
      </section>

      <FaqTabs groups={groups} />

      <section className={styles['rs-close']}>
        <div className={styles['rs-wrap']}>
          <h2>Still not answered?</h2>
          <p>Ask it on the consult. It is free, and if the answer is that we are not the right fit we
            will say so on the call rather than three weeks later.</p>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "13px", marginTop: "28px" }}>
            <a className={styles['rs-btn']} href='https://calendly.com/j-zemene-remassistance/new-meeting' target='_blank' rel='noopener'>Book a free consult <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'><path d='M5 12h14m-6-6 6 6-6 6' /></svg></a>
            <a className={styles['rs-ghost-dark']} href='/qualify'>Qualify in two minutes</a>
          </div>
        </div>
      </section>
    </main>
  );
}
