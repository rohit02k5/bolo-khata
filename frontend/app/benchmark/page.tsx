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
  return (
    <main>
      <h1>Benchmark <small>real measured numbers, failures included</small></h1>

      <div className="card">
        <b>Bolo Khata live checks — Prisma v3.0 + Timbre v2.5 (Nov 8, real API calls)</b>
        <table style={{ marginTop: 8 }}>
          <tbody>
            {live.map((r, i) => (
              <tr key={i}>
                <td>{r.what}</td>
                <td className="num">{r.val}</td>
                <td>{r.ok ? "✅" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <b>NoiseLab command benchmark — Prisma v2.5 (Oct 2026)</b>
        <div className="dim" style={{ margin: "6px 0" }}>
          84 commands × 6 conditions = 504 real API jobs.
          Action-success = correct intent + entities end-to-end.
          Baseline repo: github.com/harshita-sl/NoiseLab
        </div>
        <table>
          <thead>
            <tr><th>Condition</th><th className="num">Hindi</th>
              <th className="num">Hinglish</th><th className="num">Telugu</th>
              <th className="num">All</th></tr>
          </thead>
          <tbody>
            {v25.map((r, i) => (
              <tr key={i}><td>{r.cond}</td>
                <td className="num">{r.hi}</td><td className="num">{r.hiEn}</td>
                <td className="num">{r.te}</td><td className="num"><b>{r.all}</b></td></tr>
            ))}
          </tbody>
        </table>
        <div className="dim" style={{ marginTop: 8 }}>
          Worst split: Telenglish clean 17% — Bolo Khata's parser now covers
          romanised Telugu (verified: “rendu kilo panchadara ramesh peru”
          resolves correctly). Speech enhancement was neutral-or-negative in
          NoiseLab's tests — confirm/re-ask UX is the reliable path.
        </div>
      </div>

      <div className="card">
        <b>Honesty notes</b>
        <div className="dim" style={{ marginTop: 6 }}>
          · v2.5 numbers are NoiseLab's published results, re-measured there;
          v3.0 numbers are single-call spot checks, not a full matrix.<br/>
          · Synthetic TTS speech is easier than real speech — real-phone
          recordings land in TEST_RESULTS.md before submission.<br/>
          · Latency shown is server-reported plus measured round trips from
          Durg on consumer broadband — no cherry-picked numbers.
        </div>
      </div>
    </main>
  );
}
