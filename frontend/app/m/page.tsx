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
      setErr(e?.message || "Login failed");
    }
  }

  async function respond(tok2: string, action: "confirm" | "dispute") {
    try { await api.confirmRespond(tok2, action); load(); }
    catch (e: any) { setErr(e?.message || "Failed"); }
  }

  if (!tok) {
    return (
      <main>
        <h1>Bolo Khata <small>mera khata</small></h1>
        <div className="card list">
          <div className="dim">Login — naam + 4-digit PIN (join QR se
            banaya tha; pehli baar naam likhne par PIN set ho jata hai)</div>
          {err && <div>{err}</div>}
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam" />
          <input value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN" inputMode="numeric" maxLength={4} />
          <button className="primary" disabled={!name.trim() || pin.length !== 4}
            onClick={login}>Login</button>
        </div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...(exp?.by_day || []).map((d: any) => d.total));
  return (
    <main>
      <h1>Bolo Khata <small>mera khata</small></h1>
      {me?.shops?.map((s: any) => (
        <div className="card" key={s.shop_name}>
          <div className="row">
            <b>{s.shop_name}</b>
            <span className="amt">{inr(s.balance_paise)} baaki</span>
          </div>
        </div>
      ))}
      {err && <div className="card">{err}</div>}
      <div className="tabs">
        {(["pending", "hisaab", "kharcha"] as const).map((t) => (
          <button key={t} className={tab === t ? "sel" : ""}
            onClick={() => setTab(t)}>
            {t === "pending" ? `✅ Confirm${pending.length ? ` (${pending.length})` : ""}`
             : t === "hisaab" ? "📒 Hisaab" : "📊 Kharcha"}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <div className="card list">
          {pending.map((p) => (
            <div className="entry" key={p.id} style={{ display: "block" }}>
              <div className="row">
                <b>{p.shop_name}</b>
                <span className="amt">{inr(p.amount_paise)}</span>
              </div>
              <div className="dim">
                {(p.items || []).map((i: any) =>
                  `${i.qty} ${i.unit} ${i.name}`).join("; ")}
                {" · "}{new Date(p.ts * 1000).toLocaleDateString("en-IN")}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 6 }}>
                <button className="primary"
                  onClick={() => respond(p.confirm_token, "confirm")}>
                  ✔ Sahi hai</button>
                <button className="ghost"
                  onClick={() => respond(p.confirm_token, "dispute")}>
                  ✖ Galat hai</button>
              </div>
            </div>
          ))}
          {!pending.length && <div className="dim">koi pending confirm nahi</div>}
          {!!rems.length && <div className="dim" style={{ marginTop: 10 }}>
            🔔 Dukaan se yaad</div>}
          {rems.map((r) => (
            <div className="entry" key={r.id}>
              <span>{r.text}</span>
              {r.audio_path && (
                <audio controls src={r.audio_path}
                  style={{ height: 32, maxWidth: 140 }} />)}
            </div>
          ))}
        </div>
      )}

      {tab === "hisaab" && (
        <div className="card list">
          {ledger.map((e) => (
            <div className="entry" key={e.id}>
              <span>
                {e.kind === "payment" ? "💸 jama" : "🛒 " + e.shop_name}
                <span className="dim"> · {new Date(e.ts * 1000)
                  .toLocaleDateString("en-IN")}
                  {e.confirm_state !== "none" ? ` · ${e.confirm_state}` : ""}
                </span>
              </span>
              <span className="amt">
                {e.kind === "payment" ? "−" : ""}{inr(e.amount_paise)}
              </span>
            </div>
          ))}
          {!ledger.length && <div className="dim">koi entry nahi</div>}
        </div>
      )}

      {tab === "kharcha" && exp && (
        <div className="card list">
          <div className="dim">📅 Roz ka kharcha (last 30 din)</div>
          {exp.by_day.map((d: any) => (
            <div key={d.k} style={{ margin: "4px 0" }}>
              <div className="dim">{d.k} · {inr(d.total)}</div>
              <div style={{ height: 10, borderRadius: 5,
                background: "#f59e0b",
                width: `${Math.max(3, (d.total / maxDay) * 100)}%` }} />
            </div>
          ))}
          <div className="dim" style={{ marginTop: 10 }}>🏪 Dukaan-wise</div>
          {exp.by_shop.map((s: any) => (
            <div className="entry" key={s.k}>
              <span>{s.k}</span>
              <span className="amt">{inr(s.total)}</span>
            </div>
          ))}
          <div className="dim" style={{ marginTop: 10 }}>🗓 Mahina-wise</div>
          {exp.by_month.map((m: any) => (
            <div className="entry" key={m.k}>
              <span>{m.k}</span>
              <span className="amt">{inr(m.total)}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
