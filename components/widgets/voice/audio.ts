/**
 * Browser audio for Maya: mic capture out, model speech in.
 *
 * Both contexts must be created inside the click that starts the session —
 * iOS Safari only lets an AudioContext make sound if it was created (or
 * resumed) during a user gesture.
 */

/** Gemini Live speaks 24 kHz mono PCM16. */
const OUTPUT_RATE = 24000;

export function base64FromPcm(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function pcmFromBase64(b64: string): Float32Array<ArrayBuffer> {
  const bin = atob(b64);
  const n = bin.length >> 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
    if (v >= 0x8000) v -= 0x10000;
    out[i] = v / 0x8000;
  }
  return out;
}

export interface Mic {
  setMuted(muted: boolean): void;
  /** 0..1 loudness of the visitor's voice right now, for the waveform. */
  level(): number;
  stop(): void;
}

/** RMS of an analyser's current window, scaled so normal speech reaches ~1. */
function rms(analyser: AnalyserNode, buf: Float32Array<ArrayBuffer>): number {
  analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(sum / buf.length) * 4);
}

/**
 * Start the mic. `onChunk` gets 16 kHz PCM16 buffers of ~40 ms.
 *
 * Starts muted, so nothing leaves the browser before the caller has set up
 * the session to receive it; the caller opens it with setMuted(false).
 */
export async function createMic(onChunk: (pcm: ArrayBuffer) => void): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
  });
  const ctx = new AudioContext();
  try {
    await ctx.audioWorklet.addModule('/voice/pcm-capture-worklet.js');
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
    throw err;
  }
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-capture');
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  const buf = new Float32Array(analyser.fftSize);
  let muted = true;
  stream.getAudioTracks().forEach((t) => (t.enabled = false));
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
    if (!muted) onChunk(e.data);
  };
  src.connect(node);
  src.connect(analyser);

  return {
    setMuted(m) {
      muted = m;
      stream.getAudioTracks().forEach((t) => (t.enabled = !m));
    },
    level() {
      return muted ? 0 : rms(analyser, buf);
    },
    stop() {
      node.port.onmessage = null;
      src.disconnect();
      node.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
  };
}

export interface Player {
  /** Queue one base64 PCM16 chunk straight after whatever is already queued. */
  enqueue(b64: string): void;
  /** Drop everything queued — the visitor interrupted. */
  flush(): void;
  /** True while audio is scheduled to be playing. */
  playing(): boolean;
  /** 0..1 loudness of what is playing right now, for the lip-sync. */
  level(): number;
  close(): void;
}

export function createPlayer(): Player {
  const ctx = new AudioContext({ sampleRate: OUTPUT_RATE });
  const gain = ctx.createGain();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  gain.connect(analyser);
  analyser.connect(ctx.destination);

  const buf = new Float32Array(analyser.fftSize);
  const live = new Set<AudioBufferSourceNode>();
  let nextAt = 0;

  return {
    enqueue(b64) {
      if (ctx.state === 'suspended') void ctx.resume();
      const pcm = pcmFromBase64(b64);
      if (!pcm.length) return;
      const ab = ctx.createBuffer(1, pcm.length, OUTPUT_RATE);
      ab.copyToChannel(pcm, 0);
      const node = ctx.createBufferSource();
      node.buffer = ab;
      node.connect(gain);
      /* A small lead on the first chunk absorbs network jitter; after that
         chunks butt up against each other for gapless speech. */
      const at = Math.max(nextAt, ctx.currentTime + 0.05);
      node.start(at);
      nextAt = at + ab.duration;
      live.add(node);
      node.onended = () => live.delete(node);
    },
    flush() {
      live.forEach((n) => {
        try { n.stop(); } catch { /* already stopped */ }
      });
      live.clear();
      nextAt = 0;
    },
    playing() {
      return live.size > 0;
    },
    level() {
      return rms(analyser, buf);
    },
    close() {
      this.flush();
      void ctx.close();
    },
  };
}
