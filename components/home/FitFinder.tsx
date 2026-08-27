import QuizLogic from '@/components/quiz/QuizLogic';
import shared from './HomeSections.module.css';

/**
 * FitFinder — "Find out what your pod should look like" (index.html, Phase 02).
 * Section furniture only: the quiz itself is the same QuizLogic component
 * /qualify renders, per the de-duplication in MIGRATION-PLAN §8.
 */
export default function FitFinder() {
  return (
    <section
      id="fit-finder"
      style={{ background: 'var(--bg-marketing-paper)', borderTop: '1px solid var(--border-default)' }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px' }}>
        <span className={shared.eyebrow}>Two-minute fit finder</span>
        <div className={shared.head}>
          <h2 className={shared.title}>Find out what your <span>pod should look like</span></h2>
          <div className={shared.aside}>
            <p className={shared.desc}>
              Five questions. Each one comes with the context we&rsquo;d normally walk you through on
              a call — so you leave knowing how this works, whether or not you book.
            </p>
          </div>
        </div>
        <QuizLogic />
      </div>
    </section>
  );
}
