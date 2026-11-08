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
const TRY_ICON: Record<string, string> = {
  maggi: "🍜", chini: "🍬", daal: "🫘", chawal: "🍚", doodh: "🥛",
};
const ic = (n?: string) => TRY_ICON[(n || "").toLowerCase()] || "🛒";

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
    setBusy(true); setErr(""); setRes(null); setP(null);
    try {
      const r = await api.tryCommand(tr, lang);
      setP(r);
      if (r.spoken) speak(r.spoken, lang).catch(() => {});
    } catch (e: any) {
      setErr(e?.message?.includes("429")
        ? "Aaj ka demo limit khatam — kal phir try karo"
        : "Kuch gadbad — phir try karo");
    } finally { setBusy(false); }
  }

  async function decide(accept: boolean, method = "") {
    if (!p?.proposal_id) return;
    try {
      const r = await api.tryConfirm(p.proposal_id, accept, method);
      setRes(r);
      setP(null);
      if (r.spoken) speak(r.spoken, lang).catch(() => {});
    } catch (e: any) { setErr("Kuch gadbad — phir try karo"); }
  }

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
          <span className="tag">judge sandbox — no signup</span>
        </div>
      </header>
      <div className="banner">
        <b>🧪 Demo data — resets daily.</b>
        Synthetic shop. Parse + ledger run fully here; the mic path uses the
        live Prisma relay. Per-visitor daily cap keeps credit use tiny.
      </div>
      <div className="card list">
        <div className="row" style={{ gap: 8 }}>
          {(["hinglish", "te", "en"] as const).map((l) => (
            <button key={l} className={"chip" + (lang === l ? " sel" : "")}
              style={lang === l ? { background: "var(--primary)",
                color: "var(--primary-ink)", borderColor: "transparent",
                minHeight: 44 } : { minHeight: 44 }}
              onClick={() => setLang(l)}>
              {l === "te" ? "తెలుగు" : l === "en" ? "English" : "Hinglish"}
            </button>))}
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Type a command as Prisma would transcribe it…"
          aria-label="demo command"
          onKeyDown={(e) => e.key === "Enter" && run()} />
        <button className="primary big" disabled={busy}
          onClick={() => run()}>{busy ? "…" : "Parse →"}</button>
        <div className="dim">Ek tap se try karo:</div>
        <div className="chip-row">
          {SAMPLES.map((s) => (
            <button key={s} className="chip"
              onClick={() => { setText(s); run(s); }}>{s}</button>))}
        </div>
      </div>
      {err && <div className="banner" style={{ borderColor: "var(--bad)",
        background: "var(--bad-soft)" }}><b>Oops</b>{err}</div>}
      {p && (
        <div className="receipt">
          <div className="row" style={{ justifyContent: "space-between",
            marginBottom: 8 }}>
            <span className="pill info">
              {p.kind === "bill" ? "🧾 bill" : "⚙️ " + p.intent}</span>
            <span className={"conf " + (p.confidence >= 0.85 ? "ok" :
              p.confidence >= 0.6 ? "warn" : "bad")}>
              parse conf {(p.confidence * 100).toFixed(0)}%</span>
            {p.noise_hint && <span className="noise-chip">🌫 noise</span>}
          </div>
          {p.kind === "bill" && p.items?.length ? (
            <table><tbody>
              {p.items.map((i, idx) => (
                <tr key={idx} className="slide-in"
                  style={{ animationDelay: `${idx * 70}ms` }}>
                  <td className="sr">{idx + 1}.</td>
                  <td>{ic(i.product_name || i.name)} {i.product_name || i.name}</td>
                  <td className="num dim">{i.qty} {i.unit}</td>
                  <td className="num" style={{ fontWeight: 700 }}>
                    {inr(i.line_total_paise)}</td>
                </tr>))}
              <tr className="total-row"><td colSpan={3}>Total</td>
                <td className="num">{inr(p.total_paise)}</td></tr>
            </tbody></table>
          ) : <div style={{ fontSize: 18, margin: "8px 0",
            fontWeight: 600 }}>{p.description}</div>}
          {p.needs_confirm && (
            <div className="row wrap" style={{ marginTop: 10 }}>
              <button className="ok" onClick={() => decide(true, "cash")}>Cash</button>
              <button className="primary" onClick={() => decide(true, "upi")}>UPI</button>
              <button className="primary" onClick={() => decide(true, "khata")}>Khata</button>
              <button className="ghost" onClick={() => decide(false)}>✖</button>
            </div>)}
        </div>)}
      {res && (
        <div className="card celebrate">
          <div className="row" style={{ gap: 10 }}>
            {res.written ? "✔" : "✖"}
            <b>{res.written ? "written to demo ledger" : "not written"}</b>
          </div>
          {res.confirm_path &&
            <a className="confirm-link" style={{ marginTop: 10 }}
              href={res.confirm_path}>customer confirm link →</a>}
          {res.audio_error && <div className="dim">tts: {res.audio_error}</div>}
        </div>)}
      <div className="powered">Powered by <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
