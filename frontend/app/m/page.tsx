"use client";

import { useEffect, useState } from "react";
import { api, inr, setToken } from "../lib/api";

export default function MyKhata() {
  const [tok, setTok] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [me, setMe] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [exp, setExp] = useState<any>(null);
  const [rems, setRems] = useState<any[]>([]);
  const [tab, setTab] = useState<"pending" | "hisaab" | "kharcha">("pending");

  const load = () => {
    api.me().then(setMe).catch(() => {});
    api.mePending().then((r) => setPending(r.pending)).catch(() => {});
    api.meLedger().then((r) => setLedger(r.entries)).catch(() => {});
    api.meExpenses().then(setExp).catch(() => {});
    api.meReminders().then((r) => setRems(r.reminders)).catch(() => {});
  };

  useEffect(() => {
    const t = localStorage.getItem("bk_cust");
    if (t) { setTok(t); setToken(t); }
  }, []);
  useEffect(() => { if (tok) load(); }, [tok]);

  async function login() {
    setErr("");
    try {
      const r = await api.custLogin(name, pin);
      setToken(r.token); setTok(r.token);
      localStorage.setItem("bk_cust", r.token);
    } catch (e: any) {
      setErr("Naam ya PIN galat hai — dubara try karo");
    }
  }

  async function respond(tok2: string, action: "confirm" | "dispute") {
    try { await api.confirmRespond(tok2, action); load(); }
    catch (e: any) { setErr(e?.message || "Failed"); }
  }

  if (!tok) {
    return (
      <main className="no-tabbar">
        <header className="topbar">
          <div className="brand">
            <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
            <span className="tag">mera khata</span>
          </div>
        </header>
        <div className="card list" style={{ padding: "24px 20px" }}>
          <div style={{ fontSize: 40, textAlign: "center" }}>📒</div>
          <div className="dim" style={{ textAlign: "center" }}>
            Login — naam + 4-digit PIN (dukaan ka QR scan karke banaya tha;
            pehli baar PIN set ho jata hai)</div>
          {err && <div className="banner"><b>Oops</b>{err}</div>}
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam" aria-label="your name" />
          <input value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN" inputMode="numeric" maxLength={4}
            aria-label="4 digit PIN" />
          <button className="primary big"
            disabled={!name.trim() || pin.length !== 4}
            onClick={login}>Login →</button>
        </div>
        <div className="powered">Powered by <b>Gnani AI</b> · Prisma + Timbre</div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...(exp?.by_day || []).map((d: any) => d.total));
  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
          <span className="tag">mera khata</span>
        </div>
      </header>
      {me?.shops?.map((s: any) => (
        <div className="card" key={s.shop_name}
          style={{ background: "var(--primary-soft)",
            borderColor: "transparent" }}>
          <div className="dim" style={{ fontWeight: 700 }}>{s.shop_name}</div>
          <div className="hero-num">{inr(s.balance_paise)}</div>
          <div className="dim">baaki udhaar</div>
        </div>))}
      {err && <div className="banner"><b>Oops</b>{err}</div>}

      <div className="chip-row">
        {(["pending", "hisaab", "kharcha"] as const).map((x) => (
          <button key={x} className="chip"
            style={tab === x ? { background: "var(--primary)",
              color: "var(--primary-ink)", borderColor: "transparent" } : {}}
            onClick={() => setTab(x)}>
            {x === "pending"
              ? `✅ Confirm${pending.length ? ` (${pending.length})` : ""}`
             : x === "hisaab" ? "📒 Hisaab" : "📊 Kharcha"}
          </button>))}
      </div>

      {tab === "pending" && (
        <div className="card list">
          {pending.map((p) => (
            <div key={p.id} className="receipt" style={{ marginBottom: 6 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{p.shop_name}</b>
                <b className="bal due" style={{ fontSize: 20 }}>
                  {inr(p.amount_paise)}</b>
              </div>
              <div className="dim">
                {(p.items || []).map((i: any) =>
                  `${i.qty} ${i.unit} ${i.name}`).join("; ")}
                {" · "}{new Date(p.ts * 1000).toLocaleDateString("en-IN")}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="ok grow"
                  onClick={() => respond(p.confirm_token, "confirm")}>
                  ✔ Sahi hai</button>
                <button className="danger grow"
                  onClick={() => respond(p.confirm_token, "dispute")}>
                  ✖ Galat hai</button>
              </div>
            </div>))}
          {!pending.length && (
            <div className="empty-state"><span className="em">✅</span>
              koi pending confirm nahi — sab clear</div>)}
          {!!rems.length &&
            <div className="section-head">🔔 Dukaan se yaad</div>}
          {rems.map((r) => (
            <div className="entry" key={r.id}>
              <span>{r.text}</span>
              {r.audio_path && (
                <audio controls src={r.audio_path}
                  style={{ height: 36, maxWidth: 150 }} />)}
            </div>))}
        </div>)}

      {tab === "hisaab" && (
        <div className="card list">
          {ledger.map((e) => (
            <div className="entry" key={e.id}>
              <span className="row">
                <span style={{ fontSize: 20 }}>
                  {e.kind === "payment" ? "💸" : "🛒"}</span>
                <span>{e.kind === "payment" ? "jama" : e.shop_name}
                  <span className="dim"> · {new Date(e.ts * 1000)
                    .toLocaleDateString("en-IN")}
                    {e.confirm_state !== "none" &&
                      ` · ${e.confirm_state}`}</span>
                </span>
              </span>
              <b className={"bal " +
                (e.kind === "payment" ? "paid" : "owe")}>
                {e.kind === "payment" ? "−" : ""}{inr(e.amount_paise)}</b>
            </div>))}
          {!ledger.length && (
            <div className="empty-state"><span className="em">📒</span>
              koi entry nahi abhi</div>)}
        </div>)}

      {tab === "kharcha" && exp && (
        <div className="card list">
          <div className="section-head">📅 Roz ka kharcha · last 30 din</div>
          <div className="bars" role="img"
            aria-label="daily spend bar chart">
            {exp.by_day.slice(-14).map((d: any) => (
              <div className="b" key={d.k}>
                <i style={{ height: `${(d.total / maxDay) * 92}%` }}
                  title={`${d.k}: ${inr(d.total)}`} />
                <span>{d.k.slice(8)}</span>
              </div>))}
          </div>
          <div className="section-head">🏪 Dukaan-wise</div>
          {exp.by_shop.map((s: any) => (
            <div className="entry" key={s.k}>
              <span>{s.k}</span>
              <b className="bal">{inr(s.total)}</b>
            </div>))}
          <div className="section-head">🗓 Mahina-wise</div>
          {exp.by_month.map((m: any) => (
            <div className="entry" key={m.k}>
              <span>{m.k}</span>
              <b className="bal">{inr(m.total)}</b>
            </div>))}
        </div>)}
    </main>
  );
}
