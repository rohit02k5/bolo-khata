"use client";

import { useState } from "react";
import { api, inr, speak, Proposal } from "../lib/api";
import { SpeakerIcon, CheckIcon } from "../lib/icons";

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
        <div className="wordmark">Bolo Khata
          <span className="sub">judge sandbox</span></div>
      </header>
      <div className="banner" style={{ marginBottom: 14 }}>
        <b>Demo data — resets daily.</b>
        Synthetic shop. Parse + ledger run fully here; the mic path uses the
        live Prisma relay. Per-visitor daily cap keeps credit use tiny.
      </div>
      <div className="surface centre-col" style={{ gap: 12,
        alignItems: "stretch" }}>
        <div className="seg" style={{ width: "100%" }}>
          {(["hinglish", "te", "en"] as const).map((l) => (
            <button key={l} className={lang === l ? "sel grow" : "grow"}
              onClick={() => setLang(l)}>
              {l === "te" ? "తెలుగు" : l === "en" ? "English" : "Hinglish"}
            </button>))}
        </div>
        <input value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Type a command as Prisma would transcribe it…"
          aria-label="demo command"
          onKeyDown={(e) => e.key === "Enter" && run()} />
        <button className="primary big" disabled={busy}
          onClick={() => run()}>{busy ? "…" : "Parse"}</button>
        <div className="caption">Ek tap se try karo:</div>
        <div className="chip-row">
          {SAMPLES.map((s) => (
            <button key={s} className="chip"
              onClick={() => { setText(s); run(s); }}>{s}</button>))}
        </div>
      </div>
      {err && <div className="banner" style={{ marginTop: 12,
        background: "var(--bad-soft)" }}><b>Oops</b>{err}</div>}
      {p && (
        <div className="surface" style={{ marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between",
            marginBottom: 8 }}>
            <span className="pill info">
              {p.kind === "bill" ? "bill" : p.intent}</span>
            <span className={"conf " + (p.confidence >= 0.85 ? "ok" :
              p.confidence >= 0.6 ? "warn" : "bad")}>
              parse conf {(p.confidence * 100).toFixed(0)}%</span>
            {p.noise_hint && <span className="noise-chip">noise</span>}
          </div>
          {p.kind === "bill" && p.items?.length ? (
            <div className="bill-rows">
              {p.items.map((i, idx) => (
                <div className="bill-row" key={idx}
                  style={{ animationDelay: `${idx * 40}ms` }}>
                  <span className="em">{ic(i.product_name || i.name)}</span>
                  <span className="nm">{i.product_name || i.name}</span>
                  <span className="qn">{i.qty} {i.unit}</span>
                  <span className="amt2">{inr(i.line_total_paise)}</span>
                </div>))}
              <div className="bill-total">
                <span className="lab">Total</span>
                <span className="amt">{inr(p.total_paise)}</span>
              </div>
            </div>
          ) : <div className="title" style={{ fontSize: 19,
            margin: "10px 0" }}>{p.description}</div>}
          {p.needs_confirm && (
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="ok grow"
                onClick={() => decide(true, "cash")}>Cash</button>
              <button className="primary grow"
                onClick={() => decide(true, "upi")}>UPI</button>
              <button className="primary grow"
                onClick={() => decide(true, "khata")}>Khata</button>
              <button className="ghost"
                onClick={() => decide(false)}>✖</button>
            </div>)}
        </div>)}
      {res && (
        <div className="surface celebrate" style={{ marginTop: 12 }}>
          <div className="row" style={{ gap: 10 }}>
            {res.written
              ? <CheckIcon size={22} style={{ color: "var(--ok)" }} />
              : "✖"}
            <b>{res.written ? "written to demo ledger" : "not written"}</b>
          </div>
          {res.confirm_path &&
            <a className="confirm-link" style={{ marginTop: 10 }}
              href={res.confirm_path}>customer confirm link →</a>}
          {res.audio_error && <div className="dim">tts: {res.audio_error}</div>}
        </div>)}
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
