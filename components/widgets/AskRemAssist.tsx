'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './AskRemAssist.module.css';

/**
 * "Ask RemAssist" concierge — ported from assets/ask-remassist.js (Phase 02).
 * A keyword-matching assistant over the question library the site already
 * answers, handing off to email/tel/Calendly for anything it can't. Pure client
 * component: no backend. The legacy assets/ask-remassist.js is left untouched.
 */
const PHONE = '(832) 230-2194';
const TEL = 'tel:+18322302194';
const EMAIL = 'support@remassistance.com';
const MAILTO = 'mailto:' + EMAIL;

interface Msg {
  from: 'bot' | 'user';
  text: string;
}

const GREETING: Msg = {
  from: 'bot',
  text: 'Hi — I can answer questions on services, pricing, onboarding and security. Or tap a shortcut below.',
};

/** Short, high-signal answers keyed by topic (subset of the KB). */
const QUICK: { label: string; answer: string }[] = [
  { label: 'Your services', answer: '• Customer Service Agents — voice, chat & email inside your helpdesk\n• GTM Teams — a 2–6 seat go-to-market pod\n• SDR as a Service — list building, sequences, booked meetings\n• Extra Services — IT, AI, marketing, research.\nEvery seat is a dedicated remote hire trained on your stack.' },
  { label: 'How it works', answer: 'Free consultation → team design → pick your agents → monitored delivery. Most clients go from first call to a fully onboarded pod in two weeks, with a free trial before you commit.' },
  { label: 'Pricing', answer: 'Rates are published on the pricing page — Pro from $8/hr, Expert from $11/hr depending on coverage and judgment level. Use the 2-minute Qualify quiz for a personal estimate, or book a consult.' },
  { label: 'Free trial', answer: 'No traditional trial — instead a 30–60 day pilot at smaller scale so you can measure our SLAs before a full rollout.' },
  { label: 'Onboarding', answer: 'Roughly two weeks from first call to a fully onboarded pod, including your free trial. Documented SOPs make it faster.' },
  { label: 'Security', answer: 'ISO 9001 and ISO 27001 certified. QA on every ticket; data handled per our privacy policy.' },
  { label: 'Contact details', answer: `• Phone — ${PHONE}\n• Email — ${EMAIL}\nOr book a free consultation at a time that suits you.` },
];

// Keyword → quick index
const KW_INDEX: [RegExp, number][] = [
  [/pricing|cost|rate|price|how much|budget/, 2],
  [/trial|pilot/, 3],
  [/onboard|ramp|how long|timeline|two week|2 week/, 4],
  [/onboard|ramp|how long|timeline/, 4],
  [/security|soc|iso|compliant|certif/, 5],
  [/contact|phone|email|call|reach/, 6],
  [/service|what do you do|offer|product|outsourc/, 0],
  [/how.*work|process|steps/, 1],
];

function answerFor(input: string): Msg {
  const q = input.toLowerCase();
  for (const [re, idx] of KW_INDEX) {
    if (re.test(q)) {
      return { from: 'bot', text: QUICK[idx].answer };
    }
  }
  return { from: 'bot', text: 'I can help with services, pricing, onboarding, trial and security — or hand you straight to a person. ' + PHONE + ' / ' + EMAIL };
}

export default function AskRemAssist() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, open]);

  function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { from: 'user', text: t }, answerFor(t)]);
    setInput('');
  }

  return (
    <>
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Ask RemAssist">
          <div className={styles.head}>
            <span className={styles.avatar} aria-hidden="true">R</span>
            <div>
              <div className={styles.headTitle}>Ask RemAssist</div>
              <div className={styles.headSub}>Answers instantly · 24/7</div>
            </div>
            <button type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="Close" >×</button>
          </div>
          <div className={styles.body} ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'bot' ? styles.bot : styles.user} dangerouslySetInnerHTML={{ __html: m.text.replace(/\n/g, '<br/>') }} />
            ))}
            <div className={styles.chips}>
              {QUICK.map((q) => (
                <button key={q.label} type="button" className={styles.chip} onClick={() => send(q.label)}>{q.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.foot}>
            <input
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about services, pricing…"
            />
            <button type="button" className={styles.sendBtn} onClick={() => send()} aria-label="Send">➤</button>
          </div>
          <div className={styles.links}>
            <a href={MAILTO}>✉ {EMAIL}</a>
            <a href={TEL}>☎ {PHONE}</a>
          </div>
        </div>
      )}
      <button
        type="button"
        className={styles.launcher}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close Ask RemAssist' : 'Ask RemAssist'}
        aria-expanded={open}
      >
        {open ? (
          <span className={styles.launcherClose} aria-hidden="true">&times;</span>
        ) : (
          <>
            <span className={styles.launcherPing} aria-hidden="true" />
            <span className={styles.launcherFace}>
              {/* the Rem mark, as the artboard's launcher used */}
              <img src="/images/rem-loader-logo.svg" alt="" />
            </span>
            <span className={styles.launcherDot} aria-hidden="true" />
          </>
        )}
      </button>
    </>
  );
}