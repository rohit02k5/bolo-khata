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
      .catch(() => setErr("Link invalid ya expired hai."));
  }, [token]);

  async function respond(action: "confirm" | "dispute") {
    setBusy(true);
    const r = await api.confirmRespond(token, action);
    setState(r.state);
    setBusy(false);
  }

  return (
    <main>
      <h1>Bolo Khata <small>customer confirmation</small></h1>
      <div className="card">
        {err && <div>{err}</div>}
        {data && (
          <>
            <div className="dim">{data.shop_name}</div>
            <div style={{ fontSize: 28, fontWeight: 700, margin: "8px 0" }}>
              {inr(data.amount_paise)} udhaar
            </div>
            <div className="dim">{data.customer_name} · {new Date(data.ts * 1000).toLocaleString("en-IN")}</div>
            {data.items?.length ? (
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {data.items.map((i: any, k: number) => (
                    <tr key={k}>
                      <td>{i.name}</td><td>{i.qty} {i.unit}</td>
                      <td className="num">{inr(i.qty * i.unit_price_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            {state === "pending" ? (
              <div className="row" style={{ marginTop: 14 }}>
                <button className="primary grow" disabled={busy}
                  onClick={() => respond("confirm")}>✅ Confirm</button>
                <button className="danger grow" disabled={busy}
                  onClick={() => respond("dispute")}>⚠ Dispute</button>
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <span className={"pill " + state}>
                  {state === "confirmed" ? "✅ Confirmed" :
                   state === "disputed" ? "⚠ Disputed — shop ko inform kiya gaya" : state}
                </span>
              </div>
            )}
            <div className="audio-note" style={{ marginTop: 12 }}>
              Ye link sirf is entry ke liye hai. Confirm karne se khata lock ho jata hai.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
