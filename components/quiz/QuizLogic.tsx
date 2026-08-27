'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './QuizLogic.module.css';
import {
  QUIZ,
  score,
  encodeAnswers,
  decodeAnswers,
  HOURS_LABEL,
  type Answers,
} from '@/lib/quiz/quiz';

/**
 * QuizLogic — interactive qualification quiz, shared by /qualify and the home
 * page (§8). Pure arithmetic comes from lib/quiz; this component only handles
 * state, navigation and rendering. Results are shared via the URL hash so a
 * completed quiz is copy-pasteable ("#/…/41000" style).
 */
export default function QuizLogic() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [copied, setCopied] = useState(false);
  /* One POST per completion. A ref, not state: firing it must not re-render,
     and a restored-from-hash result should not be counted as a new run. */
  const reported = useRef(false);

  // Restore a shared result from the URL hash on first paint.
  useEffect(() => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const decoded = decodeAnswers(raw);
    if (decoded) {
      setAnswers(decoded);
      setStep(QUIZ.length);
      // A shared link is someone reading a result, not completing the quiz.
      reported.current = true;
    }
  }, []);

  const current = QUIZ[step];
  const done = step >= QUIZ.length;

  /* Anonymous funnel capture (§6.2): answers and the quote shown, no personal
     data. Fire-and-forget — the result screen never waits on it and never
     shows an error if it fails. */
  useEffect(() => {
    if (!done || reported.current) return;
    const a = answers as Answers;
    if (!a.gap || !a.hours || !a.process || !a.judgment || !a.timing) return;
    reported.current = true;
    void fetch('/api/quiz', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: a, result: score(a), completed: true }),
      keepalive: true,
    }).catch(() => {});
  }, [done, answers]);

  // Live estimate once both cost drivers are known.
  const live = useMemo(() => {
    if (!answers.hours || !answers.judgment) return null;
    return score(answers as Answers);
  }, [answers]);

  function choose(value: string) {
    const next = { ...answers, [current.id]: value } as Partial<Answers>;
    setAnswers(next);
    /* Unconditional, as the artboard's `quizStep: s.quizStep + 1` was. Guarding
       this with `step < QUIZ.length - 1` left the last answer on the last
       question forever, so `done` never flipped and the result screen — the
       entire point of the page — was unreachable. The 432-case parity test
       covers score() arithmetic, not the flow, so it stayed green throughout. */
    setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function changeAnswer(id: keyof Answers) {
    const idx = QUIZ.findIndex((q) => q.id === id);
    const next = { ...answers };
    delete next[id];
    setAnswers(next);
    setStep(idx);
  }

  function share() {
    const code = encodeAnswers(answers as Answers);
    const url = `${window.location.pathname}#${code}`;
    try {
      window.navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const result = done ? score(answers as Answers) : null;
  const progress = done ? 100 : Math.round((step / QUIZ.length) * 100);

  return (
    <section className={styles.card}>
      <div className={styles.bar}>
        <span className={styles.barFill} style={{ width: `${progress}%` }} />
      </div>
      <div className={styles.body}>
        {!done && current && (
          <>
            <div className={styles.top}>
              <span className={styles.step}>Question {step + 1} of {QUIZ.length}</span>
              {step > 0 && (
                <button type="button" className={styles.back} onClick={back}>
                  &larr; Back
                </button>
              )}
            </div>

            <h2 className={styles.q}>{current.q}</h2>
            <p className={styles.help}>{current.help}</p>

            <div className={styles.opts}>
              {current.options.map((opt, i) => (
                <button key={opt.value} type="button" className={styles.opt} onClick={() => choose(opt.value)}>
                  <span className={styles.optKey}>{i + 1}</span>
                  <span>
                    <b>{opt.label}</b>
                    <em>{opt.note}</em>
                  </span>
                  <svg className={styles.optGo} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
                </button>
              ))}
            </div>

            {live && (
              <div className={styles.live}>
                <b>{live.cost}</b>
                <span>running estimate — {live.hours} hrs at ${live.rate}/hr</span>
              </div>
            )}

            <div className={styles.fyi}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.01" /></svg>
              <p>{current.fyi}</p>
            </div>
          </>
        )}

        {done && result && (
          <>
            <div className={styles.resTop}>
              <span className={styles.resTick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg></span>
              <span className={styles.resEyebrow}>Your recommended shape</span>
            </div>
            <h2 className={styles.resTitle}>{result.title}</h2>
            <p className={styles.resBlurb}>{result.blurb}</p>

            <div className={styles.tiles}>
              <div className={styles.tile}><span>Service line</span><b>{result.service}</b></div>
              <div className={styles.tile}><span>Tier</span><b>{result.tier} — ${result.rate}/hr</b></div>
              <div className={styles.tile}><span>Est. monthly</span><b>{result.cost}</b></div>
            </div>
            <div className={styles.math}>
              <div className={styles.mathHead}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h3M8 16h3M14 12v4" /></svg>
                <b>How that number is built</b>
              </div>
              <div className={styles.mathRows}>
                <div className={styles.mathRow}>
                  <span>Coverage you selected</span>
                  <b>{HOURS_LABEL[answers.hours ?? ''] || '160 hrs/month'}</b>
                </div>
                <div className={styles.mathRow}>
                  <span>Tier your answers point at</span>
                  <b>{result.tier} — ${result.rate}/hr</b>
                </div>
                <div className={styles.mathRow}>
                  <span>Seats in the shape</span>
                  <b>{result.seats === 1 ? 'One seat' : `${result.seats} seats`}</b>
                </div>
                <div className={`${styles.mathRow} ${styles.mathRowTotal}`}>
                  <span>{result.hours} hrs × ${result.rate}/hr</span>
                  <b>{result.cost}</b>
                </div>
              </div>
              <p className={styles.mathNote}>
                An estimate, not a quote. Your exact rate depends on hours and start date; we
                confirm it on the call before anything is signed.
              </p>
            </div>

            <div className={styles.answers}>
              <span className={styles.answersHeader}>Your answers — tap any to change it and come straight back</span>
              <div className={styles.answerRow}>
                {QUIZ.map((q) => {
                  const chosen = q.options.find((o) => o.value === answers[q.id]);
                  if (!chosen) return null;
                  return (
                    <button key={q.id} type="button" className={styles.answer} onClick={() => changeAnswer(q.id)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                      <b>{q.id}</b>: {chosen.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.resCta}>
              <a className={styles.cta} href="https://calendly.com/j-zemene-remassistance/new-meeting" target="_blank" rel="noopener">
                Book a free consult
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </a>
              <button type="button" className={`${styles.cta} ${styles.quiet}`} onClick={share}>
                Copy share link
              </button>
              <span className={`${styles.copied} ${copied ? styles.copiedOn : ''}`}>Link copied</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}