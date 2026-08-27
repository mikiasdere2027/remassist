'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import styles from './AskRemAssist.module.css';
import { KB, CONTACT, chipLabel, type KbEntry } from '@/lib/chat/kb';
import { match, outsideScope } from '@/lib/chat/match';

/**
 * "Ask RemAssist" concierge.
 *
 * Chrome is a 1:1 port of the static widget in assets/ask-remassist.js — the
 * gradient header with the presence dot, the grey transcript with avatared
 * white bubbles, the full-width welcome card, the chip strip and the round
 * composer. Answers come from the current knowledge base (lib/chat/kb.ts +
 * lib/chat/match.ts).
 *
 * Where it deliberately differs from the static widget: far fewer buttons.
 * The static one stacked up to four answer links, a three-button handoff row
 * under *every* reply, and four chips — eleven targets per answer. Here the
 * three contact actions (book / message / call) and the four topic shortcuts
 * sit on the welcome card, where a visitor sees them on open; an ordinary
 * reply carries at most two links and three chips, and only the newest reply
 * keeps its chips.
 */

const MAX_LINKS = 2;
const MAX_CHIPS = 3;
const MAX_HERO_CHIPS = 4;
const AVATAR = '/images/rem-loader-logo.svg';
const MAILTO = CONTACT.mailto + '?subject=' + encodeURIComponent('Website enquiry');

interface Msg {
  from: 'bot' | 'user';
  entry?: KbEntry;   // if present, render the rich answer
  text?: string;     // plain-text fallback (user bubble, no-match, outside-scope)
  alts?: KbEntry[];  // runner-up suggestions, offered as extra chips
}

const GREETING: Msg = { from: 'bot', entry: KB.find((e) => e.id === 'greeting') };

/** Entries by id, for the chips a plain-text reply offers instead of links. */
function byId(...ids: string[]): KbEntry[] {
  return ids.map((id) => KB.find((e) => e.id === id)).filter((e): e is KbEntry => !!e);
}

/* ---- icons -------------------------------------------------------------- */
/* Same paths and 24-unit viewBox as the static widget's icon() helper. */
function Icon({ d, size = 17 }: { d: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
const I_MAIL = 'M3.5 6.5h17v11h-17v-11Zm0 .5 8.5 6 8.5-6';
const I_MIN = 'M6 12h12';
const I_SEND = 'M4 12l16-8-6 8 6 8-16-8Z';
const I_ARROW = 'M5 12h14m-6-6 6 6-6 6';
const I_CAL = 'M8 2v4m8-4v4M3.5 9.5h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5Z';
const I_PHONE = 'M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z';

/**
 * The three ways out of the chat, on the welcome card. "Leave a message" opens
 * a prefilled mail rather than an in-chat form — there is no form endpoint
 * here, and a button that promises one would be a dead end.
 */
const ACTIONS: { label: string; href: string; icon: string; cls?: string }[] = [
  { label: 'Book a consultation', href: CONTACT.book, icon: I_CAL, cls: 'primary' },
  {
    label: 'Leave a message',
    href: CONTACT.mailto + '?subject=' + encodeURIComponent('Message for the Rem Assist team'),
    icon: I_MAIL,
  },
  { label: 'Call us', href: CONTACT.tel, icon: I_PHONE, cls: 'tel' },
];

/* ---- helpers ------------------------------------------------------------ */

/** One answer link. Internal routes go through next/link. */
function AnswerLink({ label, href, first }: { label: string; href: string; first: boolean }) {
  const arrow = first ? <Icon d={I_ARROW} size={14} /> : null;
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link href={href}>{label}{arrow}</Link>;
  }
  const external = /^https?:/i.test(href);
  return (
    <a href={href} {...(external ? { target: '_blank', rel: 'noopener' } : {})}>
      {label}{arrow}
    </a>
  );
}

/**
 * Answer body. Lines starting with a bullet become list items; consecutive
 * bullets share one list so the dots line up.
 */
function Body({ lines }: { lines: string[] }) {
  const blocks: { bullets: boolean; lines: string[] }[] = [];
  for (const line of lines) {
    const bullets = line.startsWith('•');
    const tail = blocks[blocks.length - 1];
    if (tail && tail.bullets === bullets) tail.lines.push(line);
    else blocks.push({ bullets, lines: [line] });
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.bullets ? (
          <ul key={i} className={styles.list}>
            {b.lines.map((l, j) => <li key={j}>{l.slice(1).trim()}</li>)}
          </ul>
        ) : (
          b.lines.map((l, j) => <p key={i + '-' + j}>{l}</p>)
        )
      )}
    </>
  );
}

/**
 * Chips offered under the newest reply: the entry's follow-ups, then runners-up.
 * The welcome card is allowed its full shortcut row; later replies are capped
 * so the transcript never turns into a wall of pills.
 */
function chipsFor(msg: Msg, hero: boolean): KbEntry[] {
  const ids = [...(msg.entry?.chips ?? [])];
  for (const a of msg.alts ?? []) if (!ids.includes(a.id)) ids.push(a.id);
  return ids
    .map((id) => KB.find((k) => k.id === id))
    .filter((e): e is KbEntry => !!e)
    .slice(0, hero ? MAX_HERO_CHIPS : MAX_CHIPS);
}

/* ---- answer builder ----------------------------------------------------- */

function buildBotMsg(input: string): Msg {
  const trade = outsideScope(input);
  if (trade) {
    return {
      from: 'bot',
      text:
        'We don’t provide ' + trade + ' ourselves — we are a remote-team ' +
        'outsourcing partner, not a field-services company. What we do staff for ' +
        'companies in your trade: customer support, sales, back-office and admin ' +
        'seats hired as a team you approve.',
      alts: byId('services', 'human'),
    };
  }
  const { entry, alts } = match(input);
  if (!entry) {
    return {
      from: 'bot',
      text:
        'I can help with services, pricing, onboarding, trial and security — or ' +
        'hand you straight to a person on ' + CONTACT.phone + '.',
      alts: byId('menu', 'human'),
    };
  }
  return { from: 'bot', entry, alts };
}

/* ---- component ---------------------------------------------------------- */

export default function AskRemAssist() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, pending, open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  /**
   * Append the question, then the answer after a short "typing" beat. A chip
   * passes its own entry so the reply is exact rather than re-matched from the
   * chip's wording.
   */
  const ask = useCallback((text: string, entry?: KbEntry) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { from: 'user', text: t }]);
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMsgs((prev) => [...prev, entry ? { from: 'bot', entry } : buildBotMsg(t)]);
      setPending(false);
    }, 480);
  }, []);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    ask(input);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '';
  }

  /* The composer grows with the question, to the same 48–120px band. */
  function autosize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = Math.max(48, Math.min(el.scrollHeight + 2, 120)) + 'px';
  }

  const last = msgs.length - 1;

  return (
    <div className={styles.root}>
      {open && (
        <section
          className={styles.panel}
          role="dialog"
          aria-modal="false"
          aria-label="Ask RemAssist"
          onKeyDown={(e) => {
            if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
          }}
        >
          <div className={styles.head}>
            <div className={styles.face}>
              <img src={AVATAR} alt="Rem Assist" />
            </div>
            <div className={styles.id}>
              <strong>Ask RemAssist</strong>
              <span>Online · Replies instantly</span>
            </div>
            <a
              className={styles.icon}
              href={MAILTO}
              title={'Email ' + CONTACT.email}
              aria-label={'Email the team at ' + CONTACT.email}
            >
              <Icon d={I_MAIL} size={16} />
            </a>
            <button
              type="button"
              className={styles.icon}
              onClick={() => setOpen(false)}
              title="Minimise"
              aria-label="Close chat"
            >
              <Icon d={I_MIN} />
            </button>
          </div>

          <div className={styles.log} ref={logRef} role="log" aria-live="polite">
            {msgs.map((m, i) => {
              if (m.from === 'user') {
                return (
                  <div key={i} className={`${styles.row} ${styles.rowMe}`}>
                    <div className={styles.bub}><p>{m.text}</p></div>
                  </div>
                );
              }

              const e = m.entry;
              const hero = e?.id === 'greeting';
              const links = (e?.links ?? []).slice(0, MAX_LINKS);
              /* Only the newest reply keeps its chips — the static widget
                 cleared older ones for the same reason. */
              const chips = i === last ? chipsFor(m, hero) : [];

              return (
                <div key={i} style={{ display: 'contents' }}>
                  <div className={`${styles.row} ${hero ? styles.rowHero : ''}`}>
                    {!hero && (
                      <div className={styles.av}>
                        <img src={AVATAR} alt="Rem Assist" />
                      </div>
                    )}
                    <div className={styles.bub}>
                      {hero ? (
                        <>
                          {e?.title && <h3 className={styles.heroTitle}>{e.title}</h3>}
                          {(e?.text ?? []).map((l, j) => (
                            <p key={j} className={styles.heroText}>{l}</p>
                          ))}
                          <div className={styles.actions}>
                            {ACTIONS.map((a) => (
                              <a
                                key={a.label}
                                href={a.href}
                                className={a.cls ? styles[a.cls] : undefined}
                                {...(/^https?:/i.test(a.href)
                                  ? { target: '_blank', rel: 'noopener' }
                                  : {})}
                              >
                                <Icon d={a.icon} size={13} />
                                {a.label}
                              </a>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          {e?.title && <h4 className={styles.title}>{e.title}</h4>}
                          {e?.text ? <Body lines={e.text} /> : <p>{m.text}</p>}
                        </>
                      )}
                      {links.length > 0 && (
                        <div className={styles.links}>
                          {links.map(([label, href], j) => (
                            <AnswerLink key={j} label={label} href={href} first={j === 0} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <div className={`${styles.chips} ${hero ? styles.chipsHero : ''}`}>
                      {chips.map((c) => (
                        <button key={c.id} type="button" onClick={() => ask(chipLabel(c), c)}>
                          {chipLabel(c)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {pending && (
              <div className={styles.row}>
                <div className={styles.av}><img src={AVATAR} alt="" /></div>
                <div className={`${styles.bub} ${styles.typing}`}>
                  <i /><i /><i />
                </div>
              </div>
            )}
          </div>

          <form className={styles.bar} onSubmit={submit}>
            <textarea
              ref={inputRef}
              className={styles.input}
              rows={1}
              value={input}
              placeholder="Ask your question…"
              aria-label="Type your question"
              onChange={(e) => { setInput(e.target.value); autosize(e.currentTarget); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
            />
            <button type="submit" className={styles.send} disabled={!input.trim()} aria-label="Send">
              <Icon d={I_SEND} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={`${styles.launcher} ${open ? styles.launcherHidden : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Ask RemAssist — open chat"
        aria-expanded={open}
        tabIndex={open ? -1 : 0}
      >
        <span className={styles.launcherPing} aria-hidden="true" />
        <span className={styles.launcherFace}>
          <img src={AVATAR} alt="" />
        </span>
        <span className={styles.launcherDot} aria-hidden="true" />
      </button>
    </div>
  );
}
