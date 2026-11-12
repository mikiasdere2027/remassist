'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, type LiveServerMessage, type Session } from '@google/genai';
import { attributionForSubmit } from '@/lib/analytics/attribution';
import { track } from '@/lib/analytics/events';
import { CLIENT_SESSION_MAX_MS } from '@/lib/voice/config';
import { BOOK_MEETING, CAPTURE_LEAD, CHECK_AVAILABILITY, toLeadBody, type CaptureLeadArgs } from '@/lib/voice/tools';
import { base64FromPcm, createMic, createPlayer, type Mic, type Player } from './audio';

/**
 * One Maya conversation: token → Live session → mic in, speech out.
 *
 * The session itself (model, voice, prompt, tools) was fixed by the server
 * when it minted the token; this hook only moves audio and runs the one tool.
 */

export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'speaking' | 'ended' | 'error';

/** Why a session could not start or stopped early. Reason codes, never text the visitor said. */
export type VoiceError = 'mic_denied' | 'unavailable' | 'rate_limited' | 'connect_failed' | 'dropped';

export interface Line {
  who: 'maya' | 'you';
  text: string;
}

/** Sent as the first turn so Maya opens the conversation instead of waiting in silence. */
const KICKOFF = 'The visitor just opened the voice chat on the website. Greet them briefly and ask how you can help.';

function durationBucket(ms: number): string {
  const s = ms / 1000;
  if (s < 30) return '<30s';
  if (s < 120) return '30s-2m';
  if (s < 300) return '2m-5m';
  return '5m+';
}

export function useGeminiLive() {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<VoiceError | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  /* Hold-to-talk: true only while the visitor is pressing the mic button. */
  /* Hands-free: the mic stays open for the whole call unless the visitor mutes it. */
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  const [leadSaved, setLeadSaved] = useState(false);
  /** Spoken label of the meeting Maya booked, e.g. "Tuesday, Oct 7 at 10:00 AM". */
  const [booked, setBooked] = useState<string | null>(null);
  /** The lead capture_lead saved, so a booking can be stamped onto the same record. */
  const leadRef = useRef<{ id?: string; email: string } | null>(null);

  const session = useRef<Session | null>(null);
  const mic = useRef<Mic | null>(null);
  const player = useRef<Player | null>(null);
  const startedAt = useRef(0);
  const cap = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speakPoll = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  /* Set by stop() so the onclose that follows is not reported as a dropped line. */
  const closing = useRef(false);

  /** Append transcript text, merging into the last line while the same speaker continues. */
  const say = useCallback((who: Line['who'], text: string) => {
    if (!text) return;
    setLines((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.who === who) {
        return [...prev.slice(0, -1), { who, text: last.text + text }];
      }
      return [...prev, { who, text: text.trimStart() }];
    });
  }, []);

  const teardown = useCallback(() => {
    clearTimeout(cap.current);
    clearInterval(speakPoll.current);
    mic.current?.stop();
    mic.current = null;
    player.current?.close();
    player.current = null;
    const s = session.current;
    session.current = null;
    try { s?.close(); } catch { /* already closed */ }
  }, []);

  const stop = useCallback(() => {
    if (!session.current && !mic.current) return;
    closing.current = true;
    if (startedAt.current) {
      track('voice_end', { duration: durationBucket(Date.now() - startedAt.current) });
      startedAt.current = 0;
    }
    teardown();
    setStatus('ended');
  }, [teardown]);

  const fail = useCallback((reason: VoiceError) => {
    track('voice_error', { reason });
    closing.current = true;
    startedAt.current = 0;
    teardown();
    setError(reason);
    setStatus('error');
  }, [teardown]);

  /**
   * Run one of Maya's tools and tell her how it went.
   *
   * capture_lead goes through the ordinary lead pipeline. The booking tools
   * go to /api/voice/*, which answer `not_configured` (not an HTTP error)
   * until Calendly is connected; any failure reaches Maya as a short code,
   * and the prompt decides what she says about it.
   */
  const runTool = useCallback(async (id: string | undefined, name: string | undefined, args: Record<string, unknown>) => {
    const post = async (url: string, body: unknown): Promise<Record<string, unknown>> => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 429) return { ok: false, error: 'rate_limited' };
        return res.ok ? json : { ok: false, error: (json as { error?: string }).error ?? 'unavailable' };
      } catch {
        return { ok: false, error: 'unavailable' };
      }
    };
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    let response: Record<string, unknown>;
    if (name === CAPTURE_LEAD) {
      const lead = args as CaptureLeadArgs;
      const body = toLeadBody(lead, window.location.href);
      const res = await post('/api/leads', { ...body, attribution: attributionForSubmit() });
      if (res.ok) {
        leadRef.current = { id: typeof res.id === 'string' ? res.id : undefined, email: body.email };
        setLeadSaved(true);
        track('generate_lead', { lead_source: 'voice_agent', has_quiz: false });
        track('voice_lead', { meeting_requested: lead.meetingRequested === true });
      }
      /* Maya needs to know it worked, not the row id. */
      response = res.ok ? { ok: true } : { ok: false, error: res.error };
    } else if (name === CHECK_AVAILABILITY) {
      response = await post('/api/voice/availability', {
        timezone, fromDate: args.fromDate,
        leadId: leadRef.current?.id, email: leadRef.current?.email,
      });
    } else if (name === BOOK_MEETING) {
      const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
      /* Attach the booking to the lead only when it is the same person. */
      const leadId = leadRef.current?.email === email ? leadRef.current.id : undefined;
      response = await post('/api/voice/book', {
        start: args.start, name: args.name, email, phone: args.phone || undefined,
        notes: args.notes || undefined, timezone, leadId,
      });
      if (response.ok && typeof response.when === 'string') {
        setBooked(response.when);
        track('voice_booked', {});
      }
    } else {
      response = { ok: false, error: 'unknown_tool' };
    }
    session.current?.sendToolResponse({ functionResponses: [{ id, name, response }] });
  }, []);

  const onMessage = useCallback((m: LiveServerMessage) => {
    const sc = m.serverContent;
    if (sc) {
      if (sc.interrupted) player.current?.flush();
      for (const p of sc.modelTurn?.parts ?? []) {
        if (p.inlineData?.data) player.current?.enqueue(p.inlineData.data);
      }
      if (sc.inputTranscription?.text) say('you', sc.inputTranscription.text);
      if (sc.outputTranscription?.text) say('maya', sc.outputTranscription.text);
    }
    for (const fc of m.toolCall?.functionCalls ?? []) {
      void runTool(fc.id, fc.name, fc.args ?? {});
    }
  }, [runTool, say]);

  /** Must be called from a click: it creates the AudioContexts and asks for the mic. */
  const start = useCallback(async () => {
    if (session.current) return;
    closing.current = false;
    setError(null);
    setLines([]);
    setLeadSaved(false);
    setBooked(null);
    leadRef.current = null;
    setMutedState(false);
    mutedRef.current = false;
    setStatus('connecting');

    /* The player first and synchronously, while still inside the gesture. */
    player.current = createPlayer();

    let tok: { token?: string; model?: string };
    try {
      const res = await fetch('/api/voice/token', { method: 'POST' });
      if (res.status === 429) return fail('rate_limited');
      if (!res.ok) return fail('unavailable');
      tok = await res.json();
      if (!tok.token || !tok.model) return fail('unavailable');
    } catch {
      return fail('unavailable');
    }

    try {
      const ai = new GoogleGenAI({ apiKey: tok.token, httpOptions: { apiVersion: 'v1alpha' } });
      session.current = await ai.live.connect({
        model: tok.model,
        callbacks: {
          onmessage: onMessage,
          onerror: () => { if (!closing.current) fail('dropped'); },
          onclose: () => { if (!closing.current) fail('dropped'); },
        },
      });
    } catch {
      return fail('connect_failed');
    }

    startedAt.current = Date.now();
    track('voice_start', {});
    session.current.sendRealtimeInput({ text: KICKOFF });

    /* Speaking vs listening follows what the player is actually doing. */
    speakPoll.current = setInterval(() => {
      setStatus((s) => {
        if (s !== 'listening' && s !== 'speaking') return s;
        return player.current?.playing() ? 'speaking' : 'listening';
      });
    }, 150);
    cap.current = setTimeout(stop, CLIENT_SESSION_MAX_MS);
    setStatus('listening');

    /* The mic last: a denied prompt still leaves "type instead" working. */
    try {
      mic.current = await createMic((pcm) => {
        session.current?.sendRealtimeInput({
          audio: { data: base64FromPcm(pcm), mimeType: 'audio/pcm;rate=16000' },
        });
      });
      /* createMic starts muted; open it now unless the visitor already muted
         (or minimised the panel) while the permission prompt was up. */
      mic.current.setMuted(mutedRef.current);
    } catch {
      track('voice_error', { reason: 'mic_denied' });
      setError('mic_denied');
    }
  }, [fail, onMessage, stop]);

  const sendText = useCallback((text: string) => {
    const t = text.trim();
    if (!t || !session.current) return;
    say('you', t);
    /* A fresh line for the next transcript chunk rather than gluing onto the typed one. */
    setLines((prev) => [...prev, { who: 'maya', text: '' }]);
    session.current.sendRealtimeInput({ text: t });
  }, [say]);

  /**
   * Mute or unmute the open mic. The conversation itself needs no button:
   * Gemini's voice detection hears when the visitor starts and stops, and
   * talking over Maya interrupts her (the server sends `interrupted`).
   *
   * Muting tells the server the audio stream has ended, so a half-finished
   * sentence is answered rather than left waiting for more.
   */
  const setMuted = useCallback((m: boolean) => {
    if (mutedRef.current === m) return;
    mutedRef.current = m;
    mic.current?.setMuted(m);
    if (m) session.current?.sendRealtimeInput({ audioStreamEnd: true });
    setMutedState(m);
  }, []);

  /** Loudness of Maya's voice right now, read by the avatar every frame. */
  const level = useCallback(() => player.current?.level() ?? 0, []);
  /** Loudness of the visitor's voice (0 while muted). */
  const micLevel = useCallback(() => mic.current?.level() ?? 0, []);

  useEffect(() => () => { closing.current = true; teardown(); }, [teardown]);

  return {
    status, error, lines, muted, leadSaved, booked,
    hasMic: error !== 'mic_denied',
    start, stop, sendText, setMuted, level, micLevel,
  };
}
