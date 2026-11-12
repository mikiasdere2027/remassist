/**
 * Mic capture for Maya: Float32 at the context's rate in, 16 kHz mono Int16 out.
 *
 * The context runs at the device rate rather than 16 kHz because Firefox
 * refuses to connect a MediaStream to a context at a different rate. So the
 * resampling happens here: a box filter over each output sample's input
 * span, which is plenty for speech headed to a recogniser.
 *
 * Posts ~40 ms chunks (640 samples) as transferable ArrayBuffers.
 */
const TARGET_RATE = 16000;
const CHUNK = 640;

class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / TARGET_RATE;
    this.pos = 0; // fractional read position carried across render quanta
    this.acc = 0;
    this.accN = 0;
    this.out = new Int16Array(CHUNK);
    this.outN = 0;
  }

  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i];
      this.accN++;
      this.pos += 1;
      if (this.pos >= this.ratio) {
        this.pos -= this.ratio;
        const s = Math.max(-1, Math.min(1, this.acc / this.accN));
        this.out[this.outN++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        this.acc = 0;
        this.accN = 0;
        if (this.outN === CHUNK) {
          const buf = this.out.buffer;
          this.port.postMessage(buf, [buf]);
          this.out = new Int16Array(CHUNK);
          this.outN = 0;
        }
      }
    }
    return true;
  }
}

registerProcessor('pcm-capture', PcmCapture);
