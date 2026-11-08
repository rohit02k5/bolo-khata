"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { api, inr, setToken, speak, WS_URL, Proposal } from "./lib/api";
import { VoiceSession } from "./lib/mic";

const LANGS = [
  { k: "hinglish", label: "Hinglish" },
  { k: "te", label: "తెలుగు" },
  { k: "en", label: "English" },
];

const CAPTION: Record<string, string> = {
  hinglish: "Boliye… mic on hai",
  te: "చెప్పండి… మైక్ ఆన్ లో ఉంది",
  en: "Speak… mic is on",
};

export default function Home() {
  const [tok, setTok] = useState("");
  const [email, setEmail] = useState("owner@bolokhata.demo");
  const [pw, setPw] = useState("");
  const [lang, setLang] = useState("hinglish");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [detected, setDetected] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [result, setResult] = useState<{ text: string; link?: string } | null>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [upiQr, setUpiQr] = useState<{ qr: string; link: string } | null>(null);
  const [tab, setTab] = useState<
    "counter" | "ledger" | "stock" | "list" | "shop">("counter");
  const [lat, setLat] = useState<{ stt?: number; parse?: number; tts?: number }>({});
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const session = useRef<VoiceSession | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("bk_token");
    if (t) { setTok(t); setToken(t); refresh(t); }
  }, []);

  function refresh(t = tok) {
    if (!t) return;
    api.ledger().then(setLedger).catch(() => {});
    api.summary().then(setSummary).catch(() => {});
  }

  async function doLogin() {
    const r = await api.login(email, pw);
    setToken(r.token); setTok(r.token);
    localStorage.setItem("bk_token", r.token);
    refresh(r.token);
  }

  function showToast(s: string) { setToast(s); setTimeout(() => setToast(""), 2500); }

  async function toggleMic() {
    if (listening) {
      setListening(false);
      await session.current?.stop();
      session.current = null;
      return;
    }
    setProposal(null); setResult(null); setTranscript(""); setDetected("");
    setLat({});
    const s = new VoiceSession();
    session.current = s;
    s.onState = (st) => { if (st === "error" || st === "closed") setListening(false); };
    s.onMessage = (m) => {
      if (m.type === "transcript" && m.is_final && m.text) {
        setTranscript(m.text);
        setDetected(m.detected_language_code || "");
        setLat((l) => ({ ...l, stt: m.latency }));
        runCommand(m.text);
      } else if (m.type === "error") {
        showToast("STT: " + (m.message || "error"));
      }
    };
    try {
      await s.start(WS_URL);
      setListening(true);
    } catch (e: any) {
      showToast("Mic failed: " + (e?.message || e));
      setListening(false);
    }
  }

  async function runCommand(text: string) {
    const t0 = performance.now();
    try {
      const p = await api.command(text, lang);
      setLat((l) => ({ ...l, parse: Math.round(performance.now() - t0) }));
      setProposal(p);
      if (p.spoken && !p.needs_confirm) {
        const t1 = performance.now();
        speak(p.spoken, lang).then(() =>
          setLat((l) => ({ ...l, tts: Math.round(performance.now() - t1) })));
      }
    } catch (e: any) {
      showToast("Parse failed: " + (e?.message || e));
    }
  }

  async function doConfirm(accept: boolean, method = "") {
    if (!proposal) return;
    setBusy(true);
    try {
      const r = await api.confirm(proposal.proposal_id, accept, method);
      if (r.written) {
        const link = r.confirm_path ? `${window.location.origin}${r.confirm_path}` : undefined;
        setResult({
          text: r.spoken || "Done",
          link,
        });
        if (method === "upi" && proposal.total_paise) {
          const u = await api.upi(proposal.total_paise);
          const qr = await QRCode.toDataURL(u.upi, { width: 240, margin: 1 });
          setUpiQr({ qr, link: u.upi });
        } else setUpiQr(null);
        setProposal(null);
        if (r.spoken) speak(r.spoken, lang);
        refresh();
      } else {
        setProposal(null);
        showToast(accept ? (r.error || "Failed") : "Cancelled");
      }
    } finally { setBusy(false); }
  }

  async function doUndo() {
    const r = await api.undo();
    showToast(r.undone ? `Undone: ${r.undone.kind}` : "Kuch nahi tha");
    refresh();
  }

  if (!tok) {
    return (
      <main>
        <h1>Bolo Khata <small>voice-first kirana ledger · Gnani Prisma + Timbre</small></h1>
        <div className="card">
          <div className="list">
            <label className="dim">Owner login</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="password" />
            <button className="primary" onClick={doLogin}>Login</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <h1>Bolo Khata</h1>
        <div className="lang-tabs">
          {LANGS.map((l) => (
            <button key={l.k} className={lang === l.k ? "sel" : ""}
              onClick={() => setLang(l.k)}>{l.label}</button>
          ))}
        </div>
      </header>

      <div className="tabs">
        {(["counter", "ledger", "stock", "list", "shop"] as const).map((t) => (
          <button key={t} className={tab === t ? "sel" : ""} onClick={() => setTab(t)}>
            {t === "counter" ? "🎙️" : t === "ledger" ? "📒" :
             t === "stock" ? "📦" : t === "list" ? "📝" : "🏪"}
            <span className="tab-label">{
              t === "counter" ? " Counter" : t === "ledger" ? " Khata" :
              t === "stock" ? " Stock" : t === "list" ? " List" : " Shop"}</span>
          </button>
        ))}
      </div>

      {tab === "counter" && (<>
        <div className="card" style={{ textAlign: "center" }}>
          <button className={"big-mic" + (listening ? " on" : "")} onClick={toggleMic}>
            {listening ? "⏹" : "🎤"}
          </button>
          <div className="mic-caption">
            {listening ? CAPTION[lang] : "Tap to speak"}
          </div>
          <div className="transcript">{transcript || " "}</div>
          <div className="latency">
            {detected && <span>lang: {detected}</span>}
            {lat.stt != null && <span>STT {lat.stt}ms</span>}
            {lat.parse != null && <span>parse {lat.parse}ms</span>}
            {lat.tts != null && <span>TTS {lat.tts}ms</span>}
          </div>
        </div>

        {proposal && (
          <div className="card">
            <div className="dim">{proposal.intent} · confidence {(proposal.confidence * 100).toFixed(0)}%</div>
            {proposal.kind === "bill" && proposal.items?.length ? (
              <table>
                <tbody>
                  {proposal.items.map((i, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}. {i.product_name || i.name}</td>
                      <td>{i.qty} {i.unit}</td>
                      <td className="num">{inr(i.line_total_paise)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={2}>Total{proposal.customer_name ? ` · ${proposal.customer_name}` : ""}</td>
                    <td className="num">{inr(proposal.total_paise)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 18, margin: "8px 0" }}>{proposal.description}</div>
            )}
            {!!proposal.unresolved?.length && (
              <div className="dim">⚠ unresolved: {proposal.unresolved.join(", ")}</div>
            )}
            <div className="audio-note">🔊 “{proposal.spoken}”</div>
            {proposal.needs_confirm ? (
              <div className="row wrap" style={{ marginTop: 10 }}>
                {proposal.kind === "bill" && (<>
                  <button className="primary" disabled={busy} onClick={() => doConfirm(true, "cash")}>💵 Cash</button>
                  <button className="primary" disabled={busy} onClick={() => doConfirm(true, "upi")}>📲 UPI</button>
                  <button className="warn" disabled={!proposal.customer_id} onClick={() => doConfirm(true, "khata")}>📖 Khata</button>
                </>)}
                {proposal.kind === "action" && (
                  <button className="primary" disabled={busy} onClick={() => doConfirm(true)}>✅ Sahi hai</button>
                )}
                <button className="ghost" disabled={busy} onClick={() => doConfirm(false)}>✖ Nahi</button>
              </div>
            ) : null}
          </div>
        )}

        {result && (
          <div className="card">
            <div style={{ fontSize: 17 }}>✅ {result.text}</div>
            {upiQr && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <img className="qr" src={upiQr.qr} alt="UPI QR" width={200} />
                <div className="audio-note">
                  Customer scans to pay — marked “UPI (self-reported)”
                </div>
              </div>
            )}
            {result.link && (<>
              <div className="dim" style={{ marginTop: 8 }}>Customer confirm link (send via WhatsApp/SMS):</div>
              <a className="confirm-link" href={result.link} target="_blank" rel="noreferrer">{result.link}</a>
              <a className="confirm-link" style={{ marginTop: 6 }}
                 href={`https://wa.me/?text=${encodeURIComponent("Aapka udhaar confirm karein: " + result.link)}`}
                 target="_blank" rel="noreferrer">Share on WhatsApp ↗</a>
            </>)}
          </div>
        )}

        <div className="row">
          <button className="ghost" onClick={doUndo}>↩︎ Undo last</button>
          <button className="ghost" onClick={() => refresh()}>⟳ Refresh</button>
        </div>
      </>)}

      {tab === "ledger" && ledger && (
        <div className="card list">
          {summary && (
            <div className="card" style={{ background: "var(--card2)" }}>
              <div className="dim">Aaj ka hisaab</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {inr(summary.total_sales_paise)}
              </div>
              <div className="dim">
                {(Object.entries(summary.by_kind || {}) as
                  [string, { count: number; amount_paise: number }][])
                  .map(([k, v]) =>
                    `${k}: ${v.count} × ${inr(v.amount_paise)}`)
                  .join(" · ")}
              </div>
            </div>
          )}
          <div className="dim">Pending confirmations</div>
          {ledger.pending?.map((p: any) => (
            <div className="entry" key={p.id}>
              <span>{p.customer_name} · {inr(p.amount_paise)}</span>
              <span className={"pill " + p.confirm_state}>{p.confirm_state}</span>
            </div>
          ))}
          {!ledger.pending?.length && <div className="dim">none</div>}
          <div className="dim" style={{ marginTop: 8 }}>Balances</div>
          {ledger.balances?.map((b: any) => (
            <div className="entry" key={b.customer_id}>
              <span>{b.name}</span><b>{inr(b.balance_paise)}</b>
            </div>
          ))}
          <div className="dim" style={{ marginTop: 8 }}>Recent</div>
          {ledger.recent?.slice(0, 12).map((t: any) => (
            <div className="entry" key={t.id}>
              <span>{t.kind}{t.customer_name ? ` · ${t.customer_name}` : ""}</span>
              <span>{inr(t.amount_paise)}{" "}
                {t.confirm_state !== "none" && t.confirm_state !== "na" &&
                  <span className={"pill " + t.confirm_state}>{t.confirm_state}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === "stock" && ledger && <StockPanel />}
      {tab === "list" && <RemindersPanel />}
      {tab === "shop" && <ShopPanel />}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function RemindersPanel() {
  const [rems, setRems] = useState<any[]>([]);
  const load = () => api.reminders()
    .then((r) => setRems(r.reminders)).catch(() => {});
  useEffect(() => { load(); }, []);
  const restock = rems.filter((r) => r.kind === "restock");
  const others = rems.filter((r) => r.kind !== "restock");
  return (
    <div className="card list">
      <div className="dim">📝 Restock checklist (wholesaler aane par)</div>
      {restock.map((r) => {
        const p = JSON.parse(r.payload || "{}");
        return (
          <div className="entry" key={r.id}>
            <span>{(p.items || []).map(
              (i: any) => `${i.qty} ${i.unit} ${i.name}`).join("; ") ||
              p.text}</span>
            <button className="ghost" onClick={async () => {
              await api.reminderDone(r.id); load();
            }}>✔</button>
          </div>
        );
      })}
      {!restock.length && <div className="dim">empty — bolo “next time 20 kilo gehu mangwana”</div>}
      <div className="dim" style={{ marginTop: 10 }}>🔔 Voice reminders</div>
      {others.map((r) => (
        <div className="entry" key={r.id}>
          <span>{r.customer_name ? `${r.customer_name} ko yaad dilao`
            : JSON.parse(r.payload || "{}").text}</span>
          <button className="ghost" onClick={async () => {
            await api.reminderDone(r.id); load();
          }}>✔</button>
        </div>
      ))}
      {!others.length && <div className="dim">none</div>}
    </div>
  );
}

function ShopPanel() {
  const [shop, setShop] = useState<any>(null);
  const [qr, setQr] = useState("");
  useEffect(() => {
    api.shop().then(async (s) => {
      setShop(s);
      const url = `${window.location.origin}/join/${s.join_code}`;
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1 }));
    }).catch(() => {});
  }, []);
  if (!shop) return <div className="card">loading…</div>;
  return (
    <div className="card list" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{shop.name}</div>
      <div className="row" style={{ justifyContent: "center" }}>
        <select value={shop.business_type} disabled style={{ width: "auto" }}>
          <option value="kirana">Kirana</option>
        </select>
        <span className="dim">(milk/newspaper — coming soon)</span>
      </div>
      <div className="dim">Customer join QR — fixed, dukaan pe chipka do</div>
      {qr && <img className="qr" src={qr} alt="Join QR" width={200} />}
      <div className="confirm-link">
        {typeof window !== "undefined" &&
          `${window.location.origin}/join/${shop.join_code}`}
      </div>
      <div className="dim">UPI VPA: {shop.vpa || "—"}</div>
    </div>
  );
}

function StockPanel() {
  const [cat, setCat] = useState<any>(null);
  const [reo, setReo] = useState<any>(null);
  useEffect(() => {
    api.catalog().then(setCat).catch(() => {});
    api.reorder().then(setReo).catch(() => {});
  }, []);
  if (!cat) return <div className="card">loading…</div>;
  return (
    <div className="card list">
      {reo?.suggestions?.length ? (
        <>
          <div className="dim">⚠ Reorder soon</div>
          {reo.suggestions.map((s: any) => (
            <div className="entry" key={s.product_id}>
              <span>{s.name_en} · {s.days_left}d left</span>
              <b>order {s.qty} {s.unit}</b>
            </div>
          ))}
        </>
      ) : null}
      <div className="dim">Stock</div>
      {cat.products.map((p: any) => (
        <div className="entry" key={p.id}>
          <span>{p.name_en} · {inr(p.price_paise)}/{p.unit}</span>
          <span className={p.stock <= p.reorder_point ? "pill disputed" : ""}>
            {p.stock} {p.unit}
          </span>
        </div>
      ))}
    </div>
  );
}
