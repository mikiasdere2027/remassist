'use client';

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import styles from './AskRemAssist.module.css';
import { KB, CONTACT, chipLabel, type KbEntry } from '@/lib/chat/kb';
import { match, outsideScope } from '@/lib/chat/match';

/**
 * The open chat panel — everything "Ask RemAssist" is once you click it.
 *
 * Split out of AskRemAssist.tsx and loaded through next/dynamic, because this
 * subtree is what pulls in lib/chat/kb.ts. The knowledge base is 42 KB of
 * source and was the single largest thing in the root-layout chunk, parsed on
 * every route in the site for a widget that starts closed and, on most visits,
 * is never opened. The launcher is what has to be there on load; the answers
 * are not.
 *
 * Chrome is a 1:1 port of the static widget in RemAssist-Html/assets/ask-remassist.js — the
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

/* Maya, the voice mode. Its own chunk: the Gemini SDK and the audio pipeline
   load only when a visitor picks "Talk to Maya", never with the text chat. */
const MayaLive = dynamic(() => import('./voice/MayaLive'), { ssr: false });
const VOICE_ENABLED = process.env.NEXT_PUBLIC_VOICE_AGENT_ENABLED === '1';

const MAX_LINKS = 2;
/* An entry's own follow-ups are shown in full up to this many — the services
   answer offers six lines of business; runners-up only top a short row up. */
const MAX_CHIPS = 6;
const MIN_CHIPS = 3;
/* Answers after which the "speak with a real person" card would repeat itself. */
const HANDOFF_IDS = new Set(['human', 'contact', 'book', 'lead_capture']);
/* Maya fronts both modes: she is the voice, and the text chat answers in her name. */
const AVATAR = '/images/Agents/maya-headshot.jpg';

interface Msg {
  from: 'bot' | 'user';
  at: number;        // when it was sent, for the timestamp under the bubble
  entry?: KbEntry;   // if present, render the rich answer
  text?: string;     // plain-text fallback (user bubble, no-match, outside-scope)
  alts?: KbEntry[];  // runner-up suggestions, offered as extra chips
}

const greeting = (): Msg[] => [{ from: 'bot', at: Date.now(), entry: KB.find((e) => e.id === 'greeting') }];

/** "10:42 AM", in the visitor's own locale and clock. */
function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

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
const I_MIN = 'M6 12h12';
const I_CLOSE = 'M6 6l12 12M18 6 6 18';
const I_CHAT = 'M4 5.5h16v10.5H9l-5 4v-14.5Z';
const I_MIC = 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Zm-6.5 8a6.5 6.5 0 0 0 13 0M12 17.5V21';
const I_SEND = 'M4 12l16-8-6 8 6 8-16-8Z';
const I_ARROW = 'M5 12h14m-6-6 6 6-6 6';
const I_CAL = 'M8 2v4m8-4v4M3.5 9.5h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6.5A1.5 1.5 0 0 1 5 5Z';
const I_PHONE = 'M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z';
const I_USER = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8.5a7.5 7.5 0 0 1 15 0';
const I_TEAM = 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6.5 9a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.2a6.5 6.5 0 0 1 3.5 5.8';
const I_CHEV = 'M9 6l6 6-6 6';
const I_TICKS = 'M2 12.5l4 4 8-9M10 16l1 1 8-9';
const I_SPARK = 'M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18m0-12-2.5 2.5m-7 7L6 18';
const I_BARS = 'M4 20V10m6 10V4m6 16v-7m4 7H2';
const I_TAG = 'M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8l8.2 8.2a1 1 0 0 1 0 1.4l-7.4 7.4a1 1 0 0 1-1.4 0L3.5 12.3ZM8 8h.01';

/**
 * Chip icons by KB id. Anything unlisted gets the generic spark: a chip reads
 * fine without its icon, so an unmapped id costs polish, nothing more.
 */
const CHIP_ICON: Record<string, string> = {
  services: 'M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z',
  pricing: I_TAG,
  tiers: I_TAG,
  how_it_works: 'M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  human: I_USER,
  contact: I_PHONE,
  book: I_CAL,
  sales: I_BARS,
  sdr: I_BARS,
  gtm: I_BARS,
  customer_service: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2Zm-3 2v1a3 3 0 0 1-3 3h-2',
  finance: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3Zm8 3v6c0 1.7-3.6 3-8 3s-8-1.3-8-3V6m16 6v6c0 1.7-3.6 3-8 3s-8-1.3-8-3v-6',
  hr: I_TEAM,
  marketing: 'M3 10v4h3l6 4V6L6 10H3Zm13-2a5 5 0 0 1 0 8',
  ai_automation: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1',
  trial: 'M4 11h16v9H4v-9Zm-1-4h18v4H3V7Zm9 0v13M12 7s-1-4-4-4a2 2 0 0 0 0 4h4Zm0 0s1-4 4-4a2 2 0 0 1 0 4h-4Z',
};

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
 * Chips offered under the newest reply: the entry's own follow-ups in full
 * (up to MAX_CHIPS), topped up with runners-up only when that row is short.
 */
function chipsFor(msg: Msg): KbEntry[] {
  const own = (msg.entry?.chips ?? []).slice(0, MAX_CHIPS);
  const ids = [...own];
  for (const a of msg.alts ?? []) {
    if (ids.length >= Math.max(MIN_CHIPS, own.length)) break;
    if (!ids.includes(a.id)) ids.push(a.id);
  }
  return ids.map((id) => KB.find((k) => k.id === id)).filter((e): e is KbEntry => !!e);
}

/* ---- answer builder ----------------------------------------------------- */

function buildBotMsg(input: string): Msg {
  const trade = outsideScope(input);
  if (trade) {
    return {
      from: 'bot',
      at: Date.now(),
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
      at: Date.now(),
      text:
        'I can help with services, pricing, onboarding, trial and security — or ' +
        'hand you straight to a person on ' + CONTACT.phone + '.',
      alts: byId('menu', 'human'),
    };
  }
  return { from: 'bot', at: Date.now(), entry, alts };
}

/* ---- component ---------------------------------------------------------- */

export default function AskRemAssistPanel({
  visible,
  onMinimize,
  onClose,
}: {
  /** False while minimised: the panel stays mounted but hidden. */
  visible: boolean;
  /** Hide the panel and keep the conversation, so reopening picks up where it left off. */
  onMinimize: () => void;
  /** Hide the panel and end everything, including a voice call. */
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'chat' | 'voice'>('chat');
  const [msgs, setMsgs] = useState<Msg[]>(greeting);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, pending]);

  useEffect(() => () => clearTimeout(timer.current), []);

  /**
   * Append the question, then the answer after a short "typing" beat. A chip
   * passes its own entry so the reply is exact rather than re-matched from the
   * chip's wording.
   */
  const ask = useCallback((text: string, entry?: KbEntry) => {
    const t = text.trim();
    if (!t) return;
    setMsgs((prev) => [...prev, { from: 'user', at: Date.now(), text: t }]);
    setPending(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMsgs((prev) => [...prev, entry ? { from: 'bot', at: Date.now(), entry } : buildBotMsg(t)]);
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
  /* The handoff card waits until the visitor has asked twice: offered on the
     first answer it reads as "I can't help you", not as an option. */
  const asked = msgs.filter((m) => m.from === 'user').length;

  return (
    <section
      className={styles.panel}
      role="dialog"
      aria-modal="false"
      aria-label="Ask RemAssist"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); onMinimize(); }
      }}
    >
      <div className={styles.head}>
        <div className={styles.face}>
          <Image src={AVATAR} alt="" width={46} height={46} />
        </div>
        <div className={styles.id}>
          <strong>Maya</strong>
          <span>Online · AI support assistant</span>
        </div>
        <button
          type="button"
          className={styles.icon}
          onClick={onMinimize}
          title="Minimise"
          aria-label="Minimise chat"
        >
          <Icon d={I_MIN} />
        </button>
        <button
          type="button"
          className={styles.icon}
          onClick={onClose}
          title="Close"
          aria-label="Close chat"
        >
          <Icon d={I_CLOSE} />
        </button>
      </div>

      {VOICE_ENABLED && (
        <div className={styles.modes} role="tablist" aria-label="How to ask">
          <button type="button" role="tab" aria-selected={mode === 'chat'} onClick={() => setMode('chat')}>
            <Icon d={I_CHAT} size={16} /> Chat
          </button>
          <button type="button" role="tab" aria-selected={mode === 'voice'} onClick={() => setMode('voice')}>
            <Icon d={I_MIC} size={16} /> Talk to Maya
          </button>
        </div>
      )}

      {mode === 'voice' ? <MayaLive visible={visible} onSwitchToChat={() => setMode('chat')} /> : <>
      <div className={styles.log} ref={logRef} role="log" aria-live="polite">
        {msgs.map((m, i) => {
          if (m.from === 'user') {
            return (
              <div key={i} className={`${styles.row} ${styles.rowMe}`}>
                <div className={styles.me} aria-hidden="true"><Icon d={I_USER} size={15} /></div>
                <div className={styles.stack}>
                  <div className={styles.bub}><p>{m.text}</p></div>
                  <span className={styles.time}>
                    {clock(m.at)} <Icon d={I_TICKS} size={13} />
                  </span>
                </div>
              </div>
            );
          }

          const e = m.entry;
          const links = (e?.links ?? []).slice(0, MAX_LINKS);
          /* Only the newest reply keeps its chips — the static widget
             cleared older ones for the same reason. */
          const newest = i === last;
          const chips = newest ? chipsFor(m) : [];
          const handoff = newest && asked >= 2 && !HANDOFF_IDS.has(e?.id ?? '');

          return (
            <div key={i} style={{ display: 'contents' }}>
              <div className={styles.row}>
                <div className={styles.av}>
                  <Image src={AVATAR} alt="Maya" width={32} height={32} />
                </div>
                <div className={styles.stack}>
                  <div className={styles.bub}>
                    {e?.title && <h4 className={styles.title}>{e.title}</h4>}
                    {e?.text ? <Body lines={e.text} /> : <p>{m.text}</p>}
                    {links.length > 0 && (
                      <div className={styles.links}>
                        {links.map(([label, href], j) => (
                          <AnswerLink key={j} label={label} href={href} first={j === 0} />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={styles.time}>{clock(m.at)}</span>
                </div>
              </div>
              {chips.length > 0 && (
                <div className={styles.chips}>
                  {chips.map((c) => (
                    <button key={c.id} type="button" onClick={() => ask(chipLabel(c), c)}>
                      <Icon d={CHIP_ICON[c.id] ?? I_SPARK} size={14} />
                      {chipLabel(c)}
                    </button>
                  ))}
                </div>
              )}
              {handoff && (
                <button
                  type="button"
                  className={styles.handoff}
                  onClick={() => ask('Talk to a person', KB.find((k) => k.id === 'human'))}
                >
                  <span className={styles.handoffIcon}><Icon d={I_TEAM} size={18} /></span>
                  <span className={styles.handoffText}>
                    <strong>Want to speak with a real person?</strong>
                    <span>Our team is here to help.</span>
                  </span>
                  <Icon d={I_CHEV} size={16} />
                </button>
              )}
            </div>
          );
        })}

        {pending && (
          <div className={styles.row}>
            <div className={styles.av}><Image src={AVATAR} alt="" width={32} height={32} /></div>
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
      </>}
    </section>
  );
}
