"use client";

import { use, useEffect, useState } from "react";
import { api, inr } from "../../lib/api";
import { CheckIcon } from "../../lib/icons";

export const dynamic = "force-dynamic";

/* "8 Nov 2026, 12:40 pm" — unambiguous, Indian-friendly */
export function fmtDate(ts: number) {
  const d = new Date(ts * 1000);
  const mo = ["Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  let h = d.getHours(); const ap = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return `${d.getDate()} ${mo} ${d.getFullYear()}, ${h}:` +
    `${String(d.getMinutes()).padStart(2, "0")} ${ap}`;
}

export default function ConfirmPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [lang, setLang] = useState("hinglish");

  const T: Record<string, Record<string, string>> = {
    hinglish: {
      sub: "khata confirm", entry: "udhaar entry",
      ok: "Sahi hai — confirm", no: "Galat hai — dispute",
      done: "Confirmed — shukriya",
      dis: "Disputed — dukaan ko inform ho gaya",
      note: "Ye link sirf is entry ke liye hai. Confirm = khata lock. Galat lagta hai to Dispute dabao.",
      err: "Link invalid ya expired hai — dukaan se naya link maango.",
    },
    te: {
      sub: "ఖాతా నిర్ధారణ", entry: "అప్పు ఎంట్రీ",
      ok: "సరే — కన్ఫర్మ్", no: "తప్పు — డిస్ప్యూట్",
      done: "నిర్ధారించబడింది — ధన్యవాదాలు",
      dis: "డిస్ప్యూట్ — దుకాణానికి తెలిపాం",
      note: "ఈ లింక్ ఈ ఎంట్రీ కోసమే. కన్ఫర్మ్ = ఖాతా లాక్. తప్పు అనిపిస్తే డిస్ప్యూట్ నొక్కండి.",
      err: "లింక్ సరికాదు లేదా ముగిసింది — దుకాణం నుండి కొత్త లింక్ అడగండి.",
    },
  };
  const t = T[lang] || T.hinglish;

  useEffect(() => {
    api.confirmView(token)
      .then((d) => { setData(d); setState(d.state); })
      .catch(() => setErr(t.err));
  }, [token]);

  async function respond(action: "confirm" | "dispute") {
    setBusy(true);
    try { navigator.vibrate?.(action === "confirm" ? 25 : 40); } catch {}
    const r = await api.confirmRespond(token, action);
    setState(r.state);
    setBusy(false);
  }

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata
          <span className="sub">{t.sub}</span></div>
        <div className="seg" role="tablist" aria-label="language">
          {[["hinglish", "Hinglish"], ["te", "తెలుగు"]].map(([k, l]) => (
            <button key={k} className={lang === k ? "sel" : ""}
              onClick={() => setLang(k)}>{l}</button>))}
        </div>
      </header>

      {!data && !err && (
        <div className="surface list" aria-busy="true">
          <div className="skeleton" style={{ height: 22, width: "50%" }} />
          <div className="skeleton" style={{ height: 40 }} />
          <div className="skeleton" style={{ height: 90 }} />
        </div>)}
      {err && (
        <div className="surface centre-col" style={{ gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{err}</div>
        </div>)}

      {data && (
        <div className="surface centre-col"
          style={{ alignItems: "stretch", gap: 0 }}>
          <div className="centre-col" style={{ gap: 6, marginBottom: 8 }}>
            <div className="caption">{data.shop_name}</div>
            <div className="display">{inr(data.amount_paise)}</div>
            <div className="caption">
              {t.entry} · {data.customer_name} · {fmtDate(data.ts)}</div>
          </div>
          {data.items?.length ? (
            <div className="bill-rows">
              {data.items.map((i: any, k: number) => (
                <div className="bill-row" key={k}
                  style={{ animationDelay: `${k * 40}ms` }}>
                  <span className="nm">{i.name}</span>
                  <span className="qn">{i.qty} {i.unit}</span>
                  <span className="amt2">
                    {inr(i.qty * i.unit_price_paise)}</span>
                </div>))}
            </div>) : null}

          {state === "pending" ? (
            <div className="confirm-actions">
              <button className="ok big" style={{ width: "100%" }}
                disabled={busy}
                onClick={() => respond("confirm")}>
                {t.ok}</button>
              <button className="link cancel-link" disabled={busy}
                onClick={() => respond("dispute")}>
                {t.no}</button>
            </div>
          ) : (
            <div className="centre-col" style={{ marginTop: 18, gap: 10 }}>
              {state === "confirmed" ? (<>
                <svg width="52" height="52" viewBox="0 0 44 44"
                  aria-hidden="true">
                  <circle cx="22" cy="22" r="21" fill="var(--ok-soft)" />
                  <path className="check-draw" d="M13 22.5l6 6 12-14"
                    fill="none" stroke="var(--ok)" strokeWidth="4"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <b style={{ fontSize: 19, color: "var(--ok)" }}>
                  {t.done}</b>
              </>) : state === "disputed" ? (
                <span className="pill disputed" style={{ fontSize: 15,
                  padding: "8px 18px" }}>
                  {t.dis}</span>
              ) : <span className={"pill " + state}>{state}</span>}
            </div>)}
          <div className="caption" style={{ marginTop: 16,
            textAlign: "center", lineHeight: 1.6 }}>
            {t.note}
          </div>
        </div>)}
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
