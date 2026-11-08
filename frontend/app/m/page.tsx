"use client";

import { useEffect, useState } from "react";
import { api, inr, setToken } from "../lib/api";
import { BookIcon } from "../lib/icons";

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

  const mo = ["Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtD = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getDate()} ${mo[d.getMonth()]} ${d.getFullYear()}`;
  };

  if (!tok) {
    return (
      <main className="no-tabbar">
        <header className="topbar">
          <div className="wordmark">Bolo Khata
            <span className="sub">mera khata</span></div>
        </header>
        <div className="surface centre-col" style={{ gap: 14,
          padding: "26px 20px" }}>
          <BookIcon size={36} style={{ color: "var(--primary)" }} />
          <div className="dim" style={{ textAlign: "center" }}>
            Login — naam + 4-digit PIN (dukaan ka QR scan karke banaya tha;
            pehli baar PIN set ho jata hai)</div>
          {err && <div className="banner"><b>Oops</b>{err}</div>}
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam" aria-label="your name" />
          <input value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="4-digit PIN" inputMode="numeric" maxLength={4}
            aria-label="4 digit PIN" />
          <button className="primary big" style={{ width: "100%" }}
            disabled={!name.trim() || pin.length !== 4}
            onClick={login}>Login</button>
        </div>
        <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
      </main>
    );
  }

  const maxDay = Math.max(1, ...(exp?.by_day || []).map((d: any) => d.total));
  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata
          <span className="sub">mera khata</span></div>
      </header>
      {me?.shops?.map((s: any) => (
        <div className="surface centre-col" key={s.shop_name}
          style={{ gap: 4, marginBottom: 12, background:
            "linear-gradient(140deg, var(--primary-soft), var(--s1) 65%)" }}>
          <div className="caption">{s.shop_name}</div>
          <div className="display">{inr(s.balance_paise)}</div>
          <div className="caption">baaki udhaar</div>
        </div>))}
      {err && <div className="banner"><b>Oops</b>{err}</div>}

      <div className="seg" style={{ width: "100%", marginBottom: 14 }}>
        {(["pending", "hisaab", "kharcha"] as const).map((x) => (
          <button key={x} className={tab === x ? "sel grow" : "grow"}
            onClick={() => setTab(x)}>
            {x === "pending"
              ? `Confirm${pending.length ? ` (${pending.length})` : ""}`
             : x === "hisaab" ? "Hisaab" : "Kharcha"}
          </button>))}
      </div>

      {tab === "pending" && (
        <>
          {pending.map((p) => (
            <div key={p.id} className="surface"
              style={{ marginBottom: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <b>{p.shop_name}</b>
                <b className="bal due" style={{ fontSize: 20 }}>
                  {inr(p.amount_paise)}</b>
              </div>
              <div className="caption" style={{ marginTop: 4 }}>
                {(p.items || []).map((i: any) =>
                  `${i.qty} ${i.unit} ${i.name}`).join("; ")}
                {" · "}{fmtD(p.ts)}
              </div>
              <div className="confirm-actions" style={{ marginTop: 12 }}>
                <button className="ok" style={{ width: "100%" }}
                  onClick={() => respond(p.confirm_token, "confirm")}>
                  Sahi hai</button>
                <button className="link cancel-link"
                  onClick={() => respond(p.confirm_token, "dispute")}>
                  Galat hai — dispute</button>
              </div>
            </div>))}
          {!pending.length && (
            <div className="surface empty-state"><span className="em">✓</span>
              koi pending confirm nahi — sab clear</div>)}
          {!!rems.length &&
            <div className="section-head">Dukaan se yaad</div>}
          {rems.map((r) => (
            <div className="surface" key={r.id} style={{ marginBottom: 8,
              padding: "14px 16px" }}>
              <div>{r.text}</div>
              {r.audio_path && (
                <audio controls src={r.audio_path}
                  style={{ height: 36, maxWidth: 220, marginTop: 8 }} />)}
            </div>))}
        </>)}

      {tab === "hisaab" && (
        <div className="surface" style={{ padding: "4px 16px" }}>
          <div className="list">
          {ledger.map((e) => (
            <div className="entry" key={e.id}>
              <span>
                <b style={{ fontWeight: 600 }}>
                  {e.kind === "payment" ? "jama" : e.shop_name}</b>
                <span className="caption"> · {fmtD(e.ts)}
                  {e.confirm_state !== "none" &&
                    ` · ${e.confirm_state}`}</span>
              </span>
              <b className={"bal " +
                (e.kind === "payment" ? "paid" : "owe")}>
                {e.kind === "payment" ? "−" : ""}{inr(e.amount_paise)}</b>
            </div>))}
          {!ledger.length && (
            <div className="empty-state">koi entry nahi abhi</div>)}
          </div>
        </div>)}

      {tab === "kharcha" && exp && (
        <>
          <div className="section-head" style={{ marginTop: 0 }}>
            Roz ka kharcha · last 30 din</div>
          <div className="surface">
            <div className="bars" role="img"
              aria-label="daily spend bar chart">
              {exp.by_day.slice(-14).map((d: any) => (
                <div className="b" key={d.k}>
                  <i style={{ height: `${(d.total / maxDay) * 92}%` }}
                    title={`${d.k}: ${inr(d.total)}`} />
                  <span>{d.k.slice(8)}</span>
                </div>))}
            </div>
          </div>
          <div className="section-head">Dukaan-wise</div>
          <div className="surface" style={{ padding: "4px 16px" }}>
            <div className="list">
            {exp.by_shop.map((s: any) => (
              <div className="entry" key={s.k}>
                <span>{s.k}</span>
                <b className="bal">{inr(s.total)}</b>
              </div>))}
            </div>
          </div>
          <div className="section-head">Mahina-wise</div>
          <div className="surface" style={{ padding: "4px 16px" }}>
            <div className="list">
            {exp.by_month.map((m: any) => (
              <div className="entry" key={m.k}>
                <span>{m.k}</span>
                <b className="bal">{inr(m.total)}</b>
              </div>))}
            </div>
          </div>
        </>)}
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
