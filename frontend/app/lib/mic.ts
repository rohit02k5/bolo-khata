// Mic -> PCM16 @16kHz -> WebSocket relay -> Prisma streaming.
// AudioWorklet posts Int16 chunks; we forward them as binary frames.

const WORKLET_SRC = `
class PCM extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) {
      const buf = new Int16Array(ch.length);
      for (let i = 0; i < ch.length; i++) {
        const s = Math.max(-1, Math.min(1, ch[i]));
        buf[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
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
  private ws: WebSocket | null = null;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private src: MediaStreamAudioSourceNode | null = null;
  onMessage: TranscriptHandler = () => {};
  onState: (s: string) => void = () => {};

  async start(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    this.ws.binaryType = "arraybuffer";
    this.ws.onmessage = (ev) => {
      try {
        this.onMessage(JSON.parse(ev.data as string));
      } catch { /* binary frames are not sent upstream->client */ }
    };
    this.ws.onopen = () => this.onState("connected");
    this.ws.onclose = () => this.onState("closed");
    this.ws.onerror = () => this.onState("error");

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true,
               noiseSuppression: true, sampleRate: 16000 },
    });
    this.ctx = new AudioContext({ sampleRate: 16000 });
    const url = URL.createObjectURL(
      new Blob([WORKLET_SRC], { type: "application/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "pcm16");
    this.node.port.onmessage = (ev) => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(ev.data);
    };
    this.src.connect(this.node);
    this.node.connect(this.ctx.destination); // keep alive (inaudible)
    this.onState("listening");
  }

  async stop() {
    // ask the server to flush the pending utterance, then close
    try { this.ws?.send(JSON.stringify({ type: "commit" })); } catch {}
    await new Promise((r) => setTimeout(r, 1200));
    try { this.node?.disconnect(); this.src?.disconnect(); } catch {}
    try { await this.ctx?.close(); } catch {}
    this.stream?.getTracks().forEach((t) => t.stop());
    try { this.ws?.close(); } catch {}
    this.node = null; this.src = null; this.ctx = null;
    this.stream = null; this.ws = null;
    this.onState("stopped");
  }
}
