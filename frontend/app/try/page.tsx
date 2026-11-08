"use client";

import { useState } from "react";
import { api, inr, speak, Proposal } from "../lib/api";

const SAMPLES = [
  "2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam",
  "chini kitni bachi hai",
  "Ramesh ne paanch sau diye",
  "is hafte ka hisaab batao",
  "Ramesh ko yaad dilao",
  "రెండు కిలో పంచదార, రమేష్ పేరు",
];

export default function TryPage() {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("hinglish");
  const [p, setP] = useState<Proposal | null>(null);
  const [res, setRes] = useState<any>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(t?: string) {
    const tr = (t ?? text).trim();
    if (!tr) return;
    setBusy(true); setErr(""); setRes(null);
    try {
      const r = await api.tryCommand(tr, lang);
      setP(r);
      if (r.spoken) speak(r.spoken, lang).catch(() => {});
    } catch (e: any) {
      setErr(e?.message || "failed");
    } finally { setBusy(false); }
  }

  async function decide(accept: boolean, method = "") {
    if (!p?.proposal_id) return;
    try {
      const r = await api.tryConfirm(p.proposal_id, accept, method);
      setRes(r);
      setP(null);
      if (r.spoken) speak(r.spoken, lang).catch(() => {});
    } catch (e: any) { setErr(e?.message || "failed"); }
  }

  return (
    <main>
      <h1>Bolo Khata <small>judge sandbox</small></h1>
      <div className="card" style={{ borderColor: "#f59e0b" }}>
        <b>🧪 Demo data — resets daily.</b>
        <span className="dim"> Synthetic shop, no signup. Parse + ledger
        run fully here; the voice mic path uses the live Prisma relay.
        Per-visitor daily cap keeps credit use tiny.</span>
      </div>
      <div className="card">
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          {(["hinglish", "te", "en"] as const).map((l) => (
            <button key={l} className={lang === l ? "sel" : "ghost"}
              onClick={() => setLang(l)}>
              {l === "te" ? "తెలుగు" : l === "en" ? "English" : "Hinglish"}
            </button>
          ))}
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Type a command as Prisma would transcribe it…"
          onKeyDown={(e) => e.key === "Enter" && run()} />
        <button className="primary" disabled={busy} style={{ marginTop: 8 }}
          onClick={() => run()}>Parse →</button>
        <div className="dim" style={{ marginTop: 10 }}>Try:</div>
        {SAMPLES.map((s) => (
          <div key={s} className="dim"
            style={{ cursor: "pointer", padding: "2px 0" }}
            onClick={() => { setText(s); run(s); }}>▸ {s}</div>
        ))}
      </div>
      {err && <div className="card">{err}</div>}
      {p && (
        <div className="card">
          <div className="dim">{p.intent} · parse conf{" "}
            {(p.confidence * 100).toFixed(0)}%
            {p.noise_hint && <span className="noise-chip">🌫 noise</span>}
          </div>
          {p.kind === "bill" && p.items?.length ? (
            <table><tbody>
              {p.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}. {i.product_name || i.name}</td>
                  <td>{i.qty} {i.unit}</td>
                  <td className="num">{inr(i.line_total_paise)}</td>
                </tr>
              ))}
              <tr className="total-row"><td colSpan={2}>Total</td>
                <td className="num">{inr(p.total_paise)}</td></tr>
            </tbody></table>
          ) : <div style={{ fontSize: 18, margin: "8px 0" }}>{p.description}</div>}
          {p.needs_confirm ? (
            <div className="row" style={{ gap: 8 }}>
              <button className="primary" onClick={() => decide(true, "cash")}>Cash</button>
              <button className="ghost" onClick={() => decide(true, "upi")}>UPI</button>
              <button className="ghost" onClick={() => decide(true, "khata")}>Khata</button>
              <button className="ghost" onClick={() => decide(false)}>✖</button>
            </div>
          ) : null}
        </div>
      )}
      {res && (
        <div className="card">
          {res.written ? "✔ written to demo ledger" : "✖ not written"}
          {res.confirm_path &&
            <div><a href={res.confirm_path} style={{ color: "var(--info)" }}>
              customer confirm link →</a></div>}
          {res.audio_error && <div className="dim">tts: {res.audio_error}</div>}
        </div>
      )}
    </main>
  );
}
