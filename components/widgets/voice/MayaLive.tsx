'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { BOOK_URL } from '@/lib/nav';
import { CONTACT } from '@/lib/chat/kb';
import MayaAvatar, { type AvatarState } from './MayaAvatar';
import { useGeminiLive, type VoiceError } from './useGeminiLive';
import styles from './MayaLive.module.css';

/**
 * "Talk to Maya" — the live voice mode of the Ask RemAssist panel.
 *
 * Hands-free, like a phone call: one tap starts it, then the visitor just
 * talks. The mic button only mutes. Minimising the panel mutes too, so the
 * call can survive being hidden without a hot mic nobody can see.
 *
 * Loaded through next/dynamic from AskRemAssistPanel, so the Gemini SDK and
 * everything here costs nothing until a visitor picks voice mode.
 */

const ERRORS: Record<VoiceError, string> = {
  mic_denied: 'Microphone access is off, so you can type to Maya instead.',
  unavailable: 'Maya isn’t available right now.',
  rate_limited: 'You’ve started a few calls in a row. Please try again in a few minutes.',
  connect_failed: 'We couldn’t connect to Maya.',
  dropped: 'The call dropped.',
};

/** Waveform bar count, and each bar's share of the loudness — tall in the middle. */
const BARS = Array.from({ length: 21 }, (_, i) => 0.35 + 0.65 * Math.sin(((i + 0.5) / 21) * Math.PI));

/** Below this loudness the mouth stays shut — breaths and the tail of a word. */
const GATE = 0.05;
/** Mouth opens fast and closes a little slower, which reads as speech rather than flutter. */
const ATTACK = 0.55;
const RELEASE = 0.18;

/** The newest line, tail-first: a streaming reply keeps its latest words in view. */
function caption(text: string): string {
  const t = text.trim();
  return t.length > 170 ? '…' + t.slice(-170).replace(/^\S*\s/, '') : t;
}

export default function MayaLive({
  visible,
  onSwitchToChat,
}: {
  /** False while the panel is minimised. */
  visible: boolean;
  onSwitchToChat: () => void;
}) {
  const v = useGeminiLive();
  const { level, micLevel, setMuted } = v;
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');

  const avatarRef = useRef<HTMLDivElement>(null);
  const mouthRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);

  const live = v.status === 'connecting' || v.status === 'listening' || v.status === 'speaking';
  const ready = v.status === 'listening' || v.status === 'speaking';
  const fatal = v.status === 'error' ? v.error : null;
  const last = [...v.lines].reverse().find((l) => l.text.trim());
  const showTyping = ready && (typing || !v.hasMic);

  /* Never listen from a hidden panel. Unmuting on return is left to the
     visitor: coming back should not silently switch a mic on. */
  useEffect(() => {
    if (!visible) setMuted(true);
  }, [visible, setMuted]);

  /* One frame loop for everything that moves with sound: mouth, rings, bars. */
  useEffect(() => {
    let raf = 0;
    let mouth = 0;
    let lvl = 0;
    const bars = Array.from(barsRef.current?.children ?? []) as HTMLElement[];
    const tick = (t: number) => {
      const out = level();
      const heard = micLevel();

      const target = Math.max(0, out - GATE) * 3;
      mouth += (target - mouth) * (target > mouth ? ATTACK : RELEASE);
      if (mouthRef.current) mouthRef.current.style.opacity = Math.min(1, mouth).toFixed(3);

      const want = Math.max(out, heard);
      lvl += (want - lvl) * (want > lvl ? 0.5 : 0.12);
      avatarRef.current?.style.setProperty('--lvl', lvl.toFixed(3));

      const s = t / 1000;
      for (let i = 0; i < bars.length; i++) {
        const idle = 0.14 + 0.06 * Math.sin(s * 2.2 + i * 0.7);
        const wobble = 0.65 + 0.35 * Math.sin(s * 9 + i * 1.7);
        const h = Math.min(1, idle + lvl * BARS[i] * wobble * 1.4);
        bars[i].style.transform = `scaleY(${h.toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level, micLevel]);

  /* Starting needs a click: only a click counts as the user gesture iOS
     requires before an AudioContext may make sound. After that the same
     button mutes and unmutes. */
  function click() {
    if (!live) void v.start();
    else if (ready && v.hasMic) setMuted(!v.muted);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    v.sendText(draft);
    setDraft('');
  }

  const avatarState: AvatarState =
    v.status === 'speaking' ? 'speaking' : ready && !v.muted ? 'listening' : 'idle';

  let status: string;
  if (v.status === 'connecting') status = 'Connecting…';
  else if (v.status === 'speaking') status = 'Maya is speaking…';
  else if (ready && v.muted) status = 'Muted';
  else if (ready) status = 'Listening…';
  else status = 'Online';

  let heading: string;
  let sub: React.ReactNode = null;
  if (fatal) {
    heading = ERRORS[fatal];
    sub = (
      <>
        You can <button type="button" className={styles.linkBtn} onClick={onSwitchToChat}>use the chat</button>,{' '}
        <a href={BOOK_URL} target="_blank" rel="noopener">book a call</a>, or email{' '}
        <a href={CONTACT.mailto}>{CONTACT.email}</a>.
      </>
    );
  } else if (v.status === 'ended') {
    heading = 'Thanks for talking with Maya';
    sub = v.booked
      ? `Your call is booked for ${v.booked}. The calendar invite is on its way to your email.`
      : v.leadSaved
        ? 'Your details are with the team, and someone will be in touch shortly.'
        : 'Talk again any time, or book a call with the team.';
  } else if (v.status === 'idle') {
    heading = 'Hi, I’m Maya. How can I help?';
    sub = 'Ask about teams, pricing or fit, out loud. Tap the mic to start.';
  } else if (v.status === 'connecting') {
    heading = 'Connecting you to Maya…';
  } else {
    heading = last ? caption(last.text) : 'Tell me what you need help with.';
    if (v.error === 'mic_denied') sub = ERRORS.mic_denied;
    else if (v.booked) sub = `Booked: ${v.booked}`;
  }
  const long = heading.length > 70;

  let micLabel: string;
  if (v.status === 'connecting') micLabel = 'Connecting…';
  else if (ready) micLabel = v.muted ? 'Tap to unmute' : 'Tap to mute';
  else if (fatal) micLabel = 'Try again';
  else if (v.status === 'ended') micLabel = 'Tap to talk again';
  else micLabel = 'Tap to start';
  const canRetry = !fatal || (fatal !== 'rate_limited' && fatal !== 'unavailable');
  const showMic = canRetry && !(ready && !v.hasMic);

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <MayaAvatar ref={avatarRef} mouthRef={mouthRef} state={avatarState} />

        <div className={styles.status} data-state={ready && v.muted ? 'muted' : v.status}>
          <i aria-hidden="true" />
          {status}
        </div>

        {/* The only part that scrolls: a long reply must never push the
            controls below out of reach. */}
        <div className={styles.caption}>
          <h3 className={`${styles.heading} ${long ? styles.headingLong : ''}`} aria-live="polite">
            {heading}
          </h3>
          {sub && <p className={styles.sub} role={fatal ? 'alert' : undefined}>{sub}</p>}
        </div>
      </div>

      <div className={styles.dock}>
        <div
          ref={barsRef}
          className={styles.wave}
          data-active={ready || undefined}
          aria-hidden="true"
        >
          {BARS.map((_, i) => <span key={i} />)}
        </div>

        {showMic && (
          <div className={styles.micWrap}>
            <button
              type="button"
              className={styles.mic}
              data-state={ready ? (v.muted ? 'muted' : 'listening') : v.status}
              onClick={click}
              disabled={v.status === 'connecting'}
              aria-pressed={ready ? v.muted : undefined}
              aria-label={ready ? (v.muted ? 'Unmute microphone' : 'Mute microphone') : micLabel}
            >
              <MicIcon off={ready && v.muted} />
            </button>
            <span className={styles.micLabel}>{micLabel}</span>
          </div>
        )}

        {showTyping && (
          <form className={styles.type} onSubmit={submit}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message to Maya…"
              aria-label="Type a message to Maya"
              autoFocus={typing}
            />
            <button type="submit" disabled={!draft.trim()} aria-label="Send">
              <SendIcon />
            </button>
          </form>
        )}

        {live && (
          <div className={styles.actions}>
            <button type="button" className={styles.end} onClick={v.stop}>
              <EndIcon /> End conversation
            </button>
            {ready && v.hasMic && (
              <button type="button" className={styles.linkBtn} onClick={() => setTyping((t) => !t)}>
                {typing ? 'Hide keyboard' : 'Type instead'}
              </button>
            )}
          </div>
        )}
      </div>

      <p className={styles.note}>
        Maya is an AI assistant. Audio is processed by Google.{' '}
        <Link href="/privacy-policy">Privacy</Link>
      </p>
    </div>
  );
}

function MicIcon({ off = false }: { off?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" fill="currentColor" />
      <path d="M5.5 10.5a6.5 6.5 0 0 0 13 0M12 17v4.5" />
      {off && <path d="M3.5 3.5l17 17" />}
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12l16-8-6 8 6 8-16-8Z" />
    </svg>
  );
}

function EndIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 9c-2.6 0-5.1.5-7.4 1.5-.9.4-1.4 1.3-1.3 2.3l.2 1.7c.1.8.9 1.4 1.7 1.2l3-.6c.7-.1 1.2-.7 1.2-1.4v-1.6c1.7-.5 3.5-.5 5.2 0v1.6c0 .7.5 1.3 1.2 1.4l3 .6c.8.2 1.6-.4 1.7-1.2l.2-1.7c.1-1-.4-1.9-1.3-2.3C17.1 9.5 14.6 9 12 9z" />
    </svg>
  );
}
