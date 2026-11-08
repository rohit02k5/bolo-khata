export default function BenchmarkPage() {
  const v25 = [
    { cond: "Clean", hi: "92%", hiEn: "84%", te: "88%", all: "88.1%" },
    { cond: "Fan noise 10dB", hi: "—", hiEn: "—", te: "—", all: "88.1%" },
    { cond: "Fan noise 5dB", hi: "—", hiEn: "—", te: "—", all: "88.1%" },
    { cond: "Simulated telephony", hi: "—", hiEn: "—", te: "—", all: "86.9%" },
    { cond: "Traffic 10dB", hi: "—", hiEn: "—", te: "—", all: "79.8%" },
    { cond: "Babble 5dB", hi: "—", hiEn: "—", te: "—", all: "67.9%" },
  ];
  const live = [
    { what: "Prisma v3.0 REST (Hinglish TTS clip)", val: "राहुल ने 500 रुपये दिए — 110ms", ok: true },
    { what: "Prisma v3.0 stream indic-auto", val: "connected, transcript 98–174ms", ok: true },
    { what: "Relay end-to-end (browser→our WS→Prisma)", val: "\"2 किलो चीनी, 1 Maggi, 500 ग्राम dal रमेश के नाम\" 174ms", ok: true },
    { what: "Timbre v2.5 hi-en (Poorvi)", val: "1.3s buffered WAV", ok: true },
    { what: "Timbre v2.5 te-IN (Suhana)", val: "1.5s buffered WAV", ok: true },
    { what: "Telenglish bill parse (rendu kilo panchadara)", val: "resolved → ₹90 Chini + khata", ok: true },
    { what: "WS handshake with comma langs", val: "rejected — indic-auto required", ok: false },
    { what: "Partials over stream", val: "not emitted by server", ok: false },
  ];
  const pct = (s: string) => parseFloat(s) || 0;
  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Benchmark
          <span className="sub">real measured numbers, failures included</span>
        </div>
      </header>

      <div className="surface">
        <h2>Bolo Khata live checks — Prisma v3.0 + Timbre v2.5</h2>
        <div className="dim" style={{ margin: "4px 0 8px" }}>
          Nov 8, real API calls from Durg on consumer broadband</div>
        <div className="list">
          {live.map((r, i) => (
            <div className="entry" key={i} style={{ alignItems: "flex-start" }}>
              <span style={{ flex: 1 }}>{r.what}</span>
              <span className="row" style={{ gap: 8, flexShrink: 0 }}>
                <span className="dim num" style={{ maxWidth: 150,
                  textAlign: "right" }}>{r.val}</span>
                <span>{r.ok ? "✅" : "❌"}</span>
              </span>
            </div>))}
        </div>
      </div>

      <div className="surface">
        <h2>NoiseLab command benchmark — Prisma v2.5</h2>
        <div className="dim" style={{ margin: "6px 0 12px" }}>
          84 commands × 6 conditions = 504 real API jobs (Oct 2026).
          Action-success = correct intent + entities end-to-end.
          Baseline: github.com/harshita-sl/NoiseLab
        </div>
        {v25.map((r) => (
          <div key={r.cond} style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b style={{ fontSize: 15 }}>{r.cond}</b>
              <b className="num">{r.all}</b>
            </div>
            <div className="stockbar" style={{ width: "100%", height: 10,
              marginTop: 4 }}>
              <i style={{ width: `${pct(r.all)}%`,
                background: pct(r.all) >= 85 ? "var(--ok)" :
                  pct(r.all) >= 70 ? "var(--warn)" : "var(--bad)" }} />
            </div>
            <div className="dim" style={{ fontSize: 12.5, marginTop: 2 }}>
              हिंदी {r.hi} · Hinglish {r.hiEn} · తెలుగు {r.te}
            </div>
          </div>))}
        <div className="audio-note" style={{ marginTop: 8 }}>
          Worst split: Telenglish clean 17% — Bolo Khata's parser now covers
          romanised Telugu (verified: “rendu kilo panchadara ramesh peru”
          resolves correctly). Speech enhancement was neutral-or-negative —
          confirm/re-ask UX is the reliable path.
        </div>
      </div>

      <div className="surface">
        <h2>Honesty notes</h2>
        <div className="dim" style={{ marginTop: 6, fontSize: 14 }}>
          · v2.5 numbers are NoiseLab's published results, re-measured there;
          v3.0 numbers are single-call spot checks, not a full matrix.<br/>
          · Synthetic TTS speech is easier than real speech — real-phone
          recordings land in TEST_RESULTS.md before submission.<br/>
          · Latency shown is server-reported plus measured round trips —
          no cherry-picked numbers.
        </div>
      </div>
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
