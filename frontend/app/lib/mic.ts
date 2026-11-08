// Mic -> PCM16 @16kHz -> WebSocket relay -> Prisma streaming.
// AudioWorklet posts Int16 chunks; we forward them as binary frames.
//
// Shutoff contract (product-v1): `hardStop()` tears down tracks, the
// AudioContext and the WebSocket IMMEDIATELY — used the moment a final
// transcript lands and whenever a sheet opens. `live()` exposes counts
// so tests can assert zero live capture after a turn.

const WORKLET_SRC = `
class PCM extends AudioWorkletProcessor {
  constructor() { super(); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const buf = new Int16Array(ch.length);
      let sum = 0;
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        sum += s * s;
      }
      // real RMS level, throttled (~8 blocks ≈ every 2nd message)
      if (++this.n % 2 === 0) {
        this.port.postMessage({ level: Math.sqrt(sum / ch.length) });
      }
      this.port.postMessage(buf.buffer, [buf.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm16', PCM);
`;

export type TranscriptHandler = (msg: {
  type: string; text?: string; is_final?: boolean;
  detected_language_code?: string; latency?: number; message?: string;
}) => void;

export class VoiceSession {
  // --- test instrumentation: live capture counts across all sessions
  static liveTracks = 0;
  static liveSockets = 0;
  static live() {
    return { tracks: VoiceSession.liveTracks,
             sockets: VoiceSession.liveSockets };
  }

  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  onMessage: TranscriptHandler = () => {};
  onState: (s: string) => void = () => {};
  onLevel: (rms: number) => void = () => {};

  /** true while this session is actually capturing mic audio */
  get capturing() { return this.stream !== null; }

  async start(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    VoiceSession.liveSockets++;
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = (ev) => {
      try {
        this.onMessage(JSON.parse(ev.data as string));
      } catch { /* binary frames are not sent upstream->client */ }
    };
    this.ws.onopen = () => this.onState("connected");
    this.ws.onclose = () => {
      VoiceSession.liveSockets = Math.max(0, VoiceSession.liveSockets - 1);
      this.onState("closed");
    };
    this.ws.onerror = () => this.onState("error");

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true,
               noiseSuppression: true, sampleRate: 16000 },
    });
    VoiceSession.liveTracks += this.stream.getTracks().length;
    this.ctx = new AudioContext({ sampleRate: 16000 });
    const url = URL.createObjectURL(
      new Blob([WORKLET_SRC], { type: "application/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm16");
    this.node.port.onmessage = (ev) => {
      if (ev.data && typeof ev.data === "object" && "level" in ev.data) {
        this.onLevel(ev.data.level);
        return;
      }
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(ev.data);
    };
    this.src.connect(this.node);
    this.node.connect(this.ctx.destination); // keep alive (inaudible)
    this.onState("listening");
  }

  private teardown() {
    try { this.node?.disconnect(); this.src?.disconnect(); } catch {}
    try { this.ctx?.close(); } catch {}
    if (this.stream) {
      VoiceSession.liveTracks = Math.max(
        0, VoiceSession.liveTracks - this.stream.getTracks().length);
      this.stream.getTracks().forEach((t) => t.stop());
    }
    try { this.ws?.close(); } catch {}
    this.node = null; this.src = null; this.ctx = null;
    this.stream = null; this.ws = null;
  }

  /** Immediate teardown — no flush. Call on final transcript / sheet /
   *  hidden / logout so the browser's recording indicator turns off. */
  hardStop() {
    this.teardown();
    this.onState("stopped");
  }

  async stop() {
    // ask the server to flush the pending utterance, then close
    try { this.ws?.send(JSON.stringify({ type: "commit" })); } catch {}
    await new Promise((r) => setTimeout(r, 1200));
    this.teardown();
    this.onState("stopped");
  }
}

// Test instrumentation: Playwright asserts zero live tracks/sockets after
// a completed turn (the mic-shutoff acceptance test). No UI impact.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__bkMicLive =
    () => VoiceSession.live();
}
