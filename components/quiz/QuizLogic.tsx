'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './QuizLogic.module.css';
import {
  QUIZ,
  score,
  encodeAnswers,
  decodeAnswers,
  HOURS_LABEL,
  type Answers,
  type QuizResult,
} from '@/lib/quiz/quiz';

/**
 * QuizLogic — interactive qualification quiz, shared by /qualify and the home
 * page (§8). Pure arithmetic comes from lib/quiz; this component only handles
 * state, navigation and rendering. Results are shared via the URL hash so a
 * completed quiz is copy-pasteable ("#/…/41000" style).
 */
export default function QuizLogic({ popup = false }: { popup?: boolean }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [honey, setHoney] = useState('');
  const [sending, setSending] = useState(false);
  /* idle | sent | fallback — `fallback` means the POST failed and the visitor
     is being handed a pre-filled email instead, per §9.2. */
  const [capture, setCapture] = useState<'idle' | 'sent' | 'fallback'>('idle');
  /* One POST per completion. A ref, not state: firing it must not re-render,
     and a restored-from-hash result should not be counted as a new run. */
  const reported = useRef(false);
  /* Fit-finder mode: the final result is shown in a popup instead of inline. */
  const [popupOpen, setPopupOpen] = useState(false);
  /* The modal is portalled to <body>, so it cannot be trapped by an
     ancestor's overflow or transform. Gate on mount: document does not
     exist while this renders on the server. */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  // Fit-finder mode: pop the result open as soon as the quiz finishes.
  useEffect(() => {
    if (popup && done) setPopupOpen(true);
  }, [popup, done]);

  // Escape closes the popup; lock body scroll while it is open.
  useEffect(() => {
    if (!popupOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopupOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [popupOpen]);

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
       covers score() arithmetic, not the flow, so it stayed green throughout.

       One exception: once every question has an answer, go straight to the
       result. On a first run that is the same as step + 1, but after editing a
       single answer it honours what the chip row offers — "tap any to change it
       and come straight back" — instead of marching through the rest again. */
    const complete = QUIZ.every((q) => next[q.id] != null);
    setStep(complete ? QUIZ.length : step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  /* The artboard's `quizRestart`: back to an empty first question. Clearing
     `reported` too, so the fresh run counts as its own lead rather than being
     swallowed as a duplicate of the one just abandoned. */
  function restart() {
    setAnswers({});
    setStep(0);
    setPopupOpen(false);
    setCapture('idle');
    reported.current = false;
  }

  function changeAnswer(id: keyof Answers) {
    const idx = QUIZ.findIndex((q) => q.id === id);
    const next = { ...answers };
    delete next[id];
    setAnswers(next);
    setStep(idx);
  }

  /* §9.2: never lose a lead to a 500. A failed POST composes the same message
     as a mailto: instead of showing an error and dropping it. */
  function mailtoFallback(r: QuizResult) {
    const body = [
      `I just used the fit finder and got this estimate:`,
      ``,
      `Shape:    ${r.title}`,
      `Service:  ${r.service}`,
      `Tier:     ${r.tier} at $${r.rate}/hr`,
      `Coverage: ${HOURS_LABEL[answers.hours ?? ''] || ''}`,
      `Estimate: ${r.cost} / month`,
      ``,
      name ? `Name: ${name}` : '',
      `Please get in touch.`,
    ].filter(Boolean).join('\n');
    return `mailto:support@remassistance.com?subject=${encodeURIComponent('Fit finder estimate — ' + r.service)}&body=${encodeURIComponent(body)}`;
  }

  async function sendEstimate(e: React.FormEvent) {
    e.preventDefault();
    if (!result || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          honey: honey || undefined,
          source: 'qualify_quiz',
          page: window.location.href,
          quiz: { answers, result, completed: true },
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setCapture('sent');
    } catch {
      setCapture('fallback');
    } finally {
      setSending(false);
    }
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
    <>
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

        {done && result && (popup ? (
          <div className={styles.doneCompact}>
            <span className={styles.resTick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg></span>
            <span className={styles.resEyebrow}>Your result is ready</span>
            <p className={styles.doneCompactText}>
              Your recommended seat mix and estimate are in a popup — close it to come back here
              and retake, or book the free consult.
            </p>
            <button type="button" className={styles.cta} onClick={() => setPopupOpen(true)}>
              See your estimate
            </button>
          </div>
        ) : (
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

            <div className={styles.cap}>
              {capture === 'sent' ? (
                <>
                  <span className={styles.capHead}>Sent — check your inbox.</span>
                  <p className={styles.capMsg + ' ' + styles.capOk}>
                    We have your estimate on file. Someone will follow up, and the consult is free
                    either way.
                  </p>
                </>
              ) : capture === 'fallback' ? (
                <>
                  <span className={styles.capHead}>That did not go through.</span>
                  <p className={styles.capMsg + ' ' + styles.capErr}>
                    Rather than lose it,{' '}
                    <a href={mailtoFallback(result)}>send it as an email instead</a> — the estimate
                    is already filled in.
                  </p>
                </>
              ) : (
                <form onSubmit={sendEstimate}>
                  <span className={styles.capHead}>Want this estimate in writing?</span>
                  <p className={styles.capNote}>
                    We will send this exact breakdown to your inbox. No sequence, no follow-up
                    unless you ask — the consult is free either way.
                  </p>
                  <div className={styles.capRow}>
                    <label className={styles.capField}>
                      <span className={styles.capLabel}>Email</span>
                      <input
                        className={styles.capInput}
                        type="email"
                        name="email"
                        required
                        autoComplete="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                      />
                    </label>
                    <label className={styles.capField}>
                      <span className={styles.capLabel}>Name (optional)</span>
                      <input
                        className={styles.capInput}
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Your name"
                        value={name}
                        onChange={(ev) => setName(ev.target.value)}
                      />
                    </label>
                    <button type="submit" className={styles.capSubmit} disabled={sending}>
                      {sending ? 'Sending…' : 'Send it to me'}
                    </button>
                  </div>
                  {/* Bots fill this; humans never see it. The route answers 200
                      and writes nothing. */}
                  <div className={styles.capHoney} aria-hidden="true">
                    <label>
                      Do not fill this in
                      <input
                        type="text"
                        name="company_website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honey}
                        onChange={(ev) => setHoney(ev.target.value)}
                      />
                    </label>
                  </div>
                  <p className={styles.capFine}>
                    We use it to send the estimate and to get in touch about it. Nothing else — see
                    the <a href="/privacy-policy">privacy policy</a>.
                  </p>
                </form>
              )}
            </div>

            <div className={styles.resCta}>
              <a className={styles.cta} href="https://calendly.com/j-zemene-remassistance/new-meeting" target="_blank" rel="noopener">
                Book a free consult
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
              </a>
              <button type="button" className={`${styles.cta} ${styles.secondary}`} onClick={share}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><path d="M8 12h8" /></svg>
                Copy share link
              </button>
              <button type="button" className={styles.restart} onClick={restart}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Start over</button>
              <span className={`${styles.copied} ${copied ? styles.copiedOn : ''}`}>Link copied</span>
            </div>
          </>
        ))}
      </div>
    </section>

      {/* Fit-finder popup: the final result in a centered, viewport-fitting modal. */}
      {/* Closes on the backdrop only — via e.target === e.currentTarget rather
          than stopPropagation on the panel, which would also stop
          BookingModal's document-level interceptor and leave the
          "Book a free consult" button below doing nothing. */}
      {popup && popupOpen && result && mounted && createPortal(
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Fit finder result"
          onClick={(e) => { if (e.target === e.currentTarget) setPopupOpen(false); }}
        >
          <div className={styles.modal}>
            <button type="button" className={styles.modalClose} onClick={() => setPopupOpen(false)} aria-label="Close estimate">×</button>

            <div className={styles.modalHead}>
              <div className={styles.resTop}>
                <span className={styles.resTick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg></span>
                <span className={styles.resEyebrow}>Your recommended shape</span>
              </div>
              <h3 className={styles.resTitle}>{result.title}</h3>
              <p className={styles.resBlurb}>{result.blurb}</p>
            </div>

            <div className={styles.modalGrid}>
              <div className={styles.modalTiles}>
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
                  <div className={styles.mathRow}><span>Coverage you selected</span><b>{HOURS_LABEL[answers.hours ?? ''] || '160 hrs/month'}</b></div>
                  <div className={styles.mathRow}><span>Tier your answers point at</span><b>{result.tier} — ${result.rate}/hr</b></div>
                  <div className={styles.mathRow}><span>Seats in the shape</span><b>{result.seats === 1 ? 'One seat' : `${result.seats} seats`}</b></div>
                  <div className={`${styles.mathRow} ${styles.mathRowTotal}`}><span>{result.hours} hrs × ${result.rate}/hr</span><b>{result.cost}</b></div>
                </div>
                <p className={styles.mathNote}>
                  An estimate, not a quote. Your exact rate depends on hours and start date; we
                  confirm it on the call before anything is signed.
                </p>
              </div>
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
              <button type="button" className={`${styles.cta} ${styles.secondary}`} onClick={share}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><path d="M8 12h8" /></svg>Copy share link</button>
              <button type="button" className={styles.restart} onClick={restart}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>Start over</button>
              <span className={`${styles.copied} ${copied ? styles.copiedOn : ''}`}>Link copied</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}