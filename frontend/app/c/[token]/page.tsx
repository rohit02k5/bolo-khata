"use client";

import { use, useEffect, useState } from "react";
import { api, inr } from "../../lib/api";

export const dynamic = "force-dynamic";

export default function ConfirmPage({
  params,
}: PageProps<"/c/[token]">) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.confirmView(token)
      .then((d) => { setData(d); setState(d.state); })
      .catch(() => setErr("Link invalid ya expired hai — dukaan se naya link maango."));
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
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
          <span className="tag">customer confirmation</span>
        </div>
      </header>

      {!data && !err && (
        <div className="card list" aria-busy="true">
          <div className="skeleton" style={{ height: 22, width: "50%" }} />
          <div className="skeleton" style={{ height: 40 }} />
          <div className="skeleton" style={{ height: 90 }} />
        </div>)}
      {err && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>🔗</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{err}</div>
        </div>)}

      {data && (
        <div className="receipt">
          <div className="dim" style={{ fontWeight: 700 }}>{data.shop_name}</div>
          <div className="hero-num" style={{ margin: "6px 0 2px" }}>
            {inr(data.amount_paise)}</div>
          <div className="dim">udhaar entry ·{" "}
            {data.customer_name} ·{" "}
            {new Date(data.ts * 1000).toLocaleString("en-IN")}</div>
          {data.items?.length ? (
            <table style={{ marginTop: 12 }}>
              <tbody>
                {data.items.map((i: any, k: number) => (
                  <tr key={k} className="slide-in"
                    style={{ animationDelay: `${k * 60}ms` }}>
                    <td className="sr">{k + 1}.</td>
                    <td>{i.name}</td>
                    <td className="num dim">{i.qty} {i.unit}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {inr(i.qty * i.unit_price_paise)}</td>
                  </tr>))}
                <tr className="total-row">
                  <td colSpan={3}>Total</td>
                  <td className="num">{inr(data.amount_paise)}</td>
                </tr>
              </tbody>
            </table>) : null}

          {state === "pending" ? (
            <div className="confirm-actions">
              <button className="ok big grow" disabled={busy}
                onClick={() => respond("confirm")}>✅ Sahi hai — confirm</button>
              <button className="danger big" disabled={busy}
                onClick={() => respond("dispute")}>⚠ Galat hai</button>
            </div>
          ) : (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              {state === "confirmed" ? (
                <div className="row" style={{ justifyContent: "center",
                  gap: 10 }}>
                  <svg width="44" height="44" viewBox="0 0 44 44"
                    aria-hidden="true">
                    <circle cx="22" cy="22" r="21" fill="var(--ok-soft)" />
                    <path className="check-draw" d="M13 22.5l6 6 12-14"
                      fill="none" stroke="var(--ok)" strokeWidth="4"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <b style={{ fontSize: 20, color: "var(--ok)" }}>
                    Confirmed — shukriya</b>
                </div>
              ) : state === "disputed" ? (
                <span className="pill disputed" style={{ fontSize: 15,
                  padding: "8px 18px" }}>
                  ⚠ Disputed — dukaan ko inform ho gaya</span>
              ) : <span className={"pill " + state}>{state}</span>}
            </div>)}
          <div className="audio-note" style={{ marginTop: 14, textAlign: "center" }}>
            Ye link sirf is entry ke liye hai. Confirm = khata lock.
            Galat lagta hai to Dispute dabao.
          </div>
        </div>)}
      <div className="powered">Powered by <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
