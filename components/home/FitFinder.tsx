import FitFinderQuiz from './FitFinderQuiz';
import shared from './HomeSections.module.css';

/**
 * FitFinder — "Find out what your pod should look like" (index.html, Phase 02).
 * Section furniture only: the quiz itself is the same QuizLogic component
 * /qualify renders, per the de-duplication in MIGRATION-PLAN §8.
 * The result itself is one portalled popup now, the same on both pages.
 *
 * Stays a server component — the furniture below is all static. The quiz goes
 * through FitFinderQuiz, which is the client boundary that lets it load on
 * approach rather than on page load; see the note in that file.
 */
export default function FitFinder() {
  return (
    <section
      id="fit-finder"
      style={{
        background: 'var(--bg-marketing-paper)',
        borderTop: '1px solid var(--border-default)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Drifting dot field — same effect as the Our Services section (index.html). */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-40px',
          backgroundImage: 'radial-gradient(rgba(14,42,74,0.11) 1.6px, transparent 1.7px)',
          backgroundSize: '22px 22px',
          animation: 'dotDrift 34s linear infinite',
          pointerEvents: 'none',
        }}
      />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '96px 24px', position: 'relative', zIndex: 1 }}>
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
        <FitFinderQuiz />
      </div>
    </section>
  );
}
