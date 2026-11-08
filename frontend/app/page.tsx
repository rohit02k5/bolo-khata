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

/* UI strings per language. Telugu lines are mirrored in
   TELUGU_REVIEW.md for Rohit's ear review. */
const T: Record<string, Record<string, string>> = {
  hinglish: {
    counter: "Counter", ledger: "Khata", stock: "Stock",
    list: "List", shop: "Dukaan",
    idle: "Bolo, main sun raha hoon",
    tap: "Mic dabao aur bolo",
    listening: "Boliye… mic on hai",
    thinking: "Samajh raha hoon…",
    speaking: "Bol raha hoon…",
    placeholder: "“2 kilo cheeni, 1 Maggi, Ramesh ke naam”",
    cash: "💵 Cash", upi: "📲 UPI", khata: "📖 Khata me likho",
    paid: "Abhi paid", ok: "✅ Sahi hai", no: "✖ Nahi",
    undo: "↩︎ Undo last", refresh: "⟳",
    debug: "STT · parse · TTS",
    summary: "Aaj ka hisaab", pendingH: "Pending confirmations",
    balancesH: "Kaun kitna deta hai", recentH: "Recent",
    none: "koi nahi — sab clear ✓",
    restockH: "Restock checklist", restockSub: "wholesaler aane par",
    remH: "Voice reminders", delH: "Daily deliveries",
    weekH: "Is hafte", searchPh: "naam dhundo…",
    selfReport: "Customer UPI se pay karke dikhayega — self-reported, verify nahi hota",
    done: "Done", joinQr: "Customer join QR — dukaan pe chipka do",
    shareWa: "WhatsApp pe bhejo ↗",
    linkNote: "Customer confirm link (WhatsApp/SMS se bhejo):",
    powered: "Powered by Gnani AI · Prisma + Timbre",
    offline: "📶 Offline — entries sync nahi hongi, reconnect ho jayega",
    staffMode: "👷 Staff mode — billing + stock only",
    micFail: "Mic nahi khula — permission check karo",
    parseFail: "Samajh nahi aaya — phir se boliye",
    silence: "Kuch sunai nahi diya — phir boliye",
  },
  te: {
    counter: "కౌంటర్", ledger: "ఖాతా", stock: "స్టాక్",
    list: "జాబితా", shop: "దుకాణం",
    idle: "చెప్పండి, వింటున్నాను",
    tap: "మైక్ నొక్కి చెప్పండి",
    listening: "చెప్పండి… మైక్ ఆన్",
    thinking: "అర్థం చేస్తున్నాను…",
    speaking: "చెబుతున్నాను…",
    placeholder: "“రెండు కిలో పంచదార, రమేష్ పేరు”",
    cash: "💵 క్యాష్", upi: "📲 UPI", khata: "📖 ఖాతాలో రాయి",
    paid: "ఇప్పుడే చెల్లింపు", ok: "✅ సరే", no: "✖ వద్దు",
    undo: "↩︎ రద్దు", refresh: "⟳",
    debug: "STT · parse · TTS",
    summary: "ఈరోజు లెక్క", pendingH: "నిర్ధారణ కావాలి",
    balancesH: "ఎవరు ఎంత ఇవ్వాలి", recentH: "ఇటీవల",
    none: "ఏమీ లేదు — అంతా సరే ✓",
    restockH: "స్టాక్ జాబితా", restockSub: "హోల్‌సేల్ వచ్చినప్పుడు",
    remH: "వాయిస్ రిమైండర్లు", delH: "రోజువారీ డెలివరీలు",
    weekH: "ఈ వారం", searchPh: "పేరు వెతకండి…",
    selfReport: "కస్టమర్ UPI తో చెల్లిస్తారు — self-reported",
    done: "పూర్తయింది", joinQr: "కస్టమర్ QR — దుకాణంపై అతికించండి",
    shareWa: "WhatsApp లో పంపండి ↗",
    linkNote: "కస్టమర్ నిర్ధారణ లింక్:",
    powered: "Gnani AI · Prisma + Timbre తో నిర్మితం",
    offline: "📶 ఆఫ్‌లైన్ — మళ్లీ కనెక్ట్ అవుతుంది",
    staffMode: "👷 స్టాఫ్ మోడ్ — బిల్లింగ్ + స్టాక్ మాత్రమే",
    micFail: "మైక్ తెరవలేదు — permission చూడండి",
    parseFail: "అర్థం కాలేదు — మళ్లీ చెప్పండి",
    silence: "ఏమీ వినపడలేదు — మళ్లీ చెప్పండి",
  },
  en: {
    counter: "Counter", ledger: "Khata", stock: "Stock",
    list: "List", shop: "Shop",
    idle: "Speak, I'm listening",
    tap: "Tap the mic and speak",
    listening: "Speak… mic is on",
    thinking: "Working it out…",
    speaking: "Speaking…",
    placeholder: "“2 kilo cheeni, 1 Maggi, for Ramesh”",
    cash: "💵 Cash", upi: "📲 UPI", khata: "📖 Add to khata",
    paid: "Pay now", ok: "✅ Looks right", no: "✖ No",
    undo: "↩︎ Undo last", refresh: "⟳",
    debug: "STT · parse · TTS",
    summary: "Today's takings", pendingH: "Pending confirmations",
    balancesH: "Who owes what", recentH: "Recent",
    none: "nothing — all clear ✓",
    restockH: "Restock checklist", restockSub: "for the wholesaler visit",
    remH: "Voice reminders", delH: "Daily deliveries",
    weekH: "This week", searchPh: "search a name…",
    selfReport: "Customer pays by UPI — self-reported, not verified",
    done: "Done", joinQr: "Customer join QR — stick it on the counter",
    shareWa: "Send on WhatsApp ↗",
    linkNote: "Customer confirm link (send via WhatsApp/SMS):",
    powered: "Powered by Gnani AI · Prisma + Timbre",
    offline: "📶 Offline — entries won't sync until reconnect",
    staffMode: "👷 Staff mode — billing + stock only",
    micFail: "Mic didn't open — check permission",
    parseFail: "Didn't catch that — say it again",
    silence: "Heard nothing — speak again",
  },
};

const ICONS: Record<string, string> = {
  maggi: "🍜", chini: "🍬", daal: "🫘", chawal: "🍚", aata: "🌾",
  tel: "🫗", coke: "🥤", "parle-g": "🍪", doodh: "🥛", sabun: "🧼",
  shampoo: "🧴", anda: "🥚", pav: "🍞", "chai patti": "🍵",
  namkeen: "🥨", matchbox: "🔥", surf: "🧺", toothpaste: "🪥",
  kurkure: "🌽", ghee: "🧈", besan: "🫓", masala: "🌶️",
  dahi: "🥣", akhbar: "📰", "maggi sauce": "🥫",
};
const icon = (name?: string) =>
  ICONS[(name || "").toLowerCase()] || "🛒";

/* "500 g × ₹0.14" reads badly — show the price per sellable unit
   (₹140/kg, ₹180/liter) when the item unit is a small measure. */
const unitPrice = (i: { qty: number; unit: string;
  unit_price_paise?: number | null }) => {
  if (i.unit_price_paise == null) return `${i.qty} ${i.unit}`;
  const u = i.unit.toLowerCase();
  if (u === "g" || u === "gram")
    return `${i.qty} ${i.unit} × ${inr(i.unit_price_paise * 1000)}/kg`;
  if (u === "ml")
    return `${i.qty} ${i.unit} × ${inr(i.unit_price_paise * 1000)}/liter`;
  return `${i.qty} ${i.unit} × ${inr(i.unit_price_paise)}`;
};

type Phase = "idle" | "listening" | "thinking" | "speaking";

export default function Home() {
  const [tok, setTok] = useState("");
  const [email, setEmail] = useState("owner@bolokhata.demo");
  const [pw, setPw] = useState("");
  const [lang, setLang] = useState("hinglish");
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0));
  const [transcript, setTranscript] = useState("");
  const [detected, setDetected] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [result, setResult] = useState<{ text: string; link?: string } | null>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [upiQr, setUpiQr] = useState<{ qr: string; link: string } | null>(null);
  const [paySheet, setPaySheet] = useState(false);
  const [tab, setTab] = useState<
    "counter" | "ledger" | "stock" | "list" | "shop">("counter");
  const [lat, setLat] = useState<{ stt?: number; parse?: number; tts?: number }>({});
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("owner");
  const [staffName, setStaffName] = useState("");
  const [staffPin, setStaffPin] = useState("");
  const [loginMode, setLoginMode] = useState<"owner" | "staff">("owner");
  const [online, setOnline] = useState(true);
  const [dark, setDark] = useState(false);
  const session = useRef<VoiceSession | null>(null);
  const receiptRef = useRef<HTMLDivElement | null>(null);

  // keep the receipt + its buttons on screen when a proposal lands
  useEffect(() => {
    if (proposal) receiptRef.current?.scrollIntoView(
      { behavior: "smooth", block: "nearest" });
  }, [proposal]);

  const t = T[lang] || T.hinglish;

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    setDark(document.documentElement.dataset.theme === "dark");
    return () => { window.removeEventListener("online", on);
      window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const tk = localStorage.getItem("bk_token");
    const r = localStorage.getItem("bk_role") || "owner";
    if (tk) { setTok(tk); setToken(tk); setRole(r); refresh(tk); }
    // demo/screenshot hook: ?say=<transcript> runs a command without mic
    const say = new URLSearchParams(window.location.search).get("say");
    if (say && tk) { setTranscript(say); runCommand(say); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("bk_theme", next); } catch {}
  }

  function refresh(tk = tok) {
    if (!tk) return;
    api.ledger().then(setLedger).catch(() => {});
    api.summary().then(setSummary).catch(() => {});
  }

  async function doLogin() {
    const r = await api.login(email, pw);
    setToken(r.token); setTok(r.token); setRole("owner");
    localStorage.setItem("bk_token", r.token);
    localStorage.setItem("bk_role", "owner");
    refresh(r.token);
  }

  async function doStaffLogin() {
    const r = await api.staffLogin(staffName, staffPin);
    setToken(r.token); setTok(r.token); setRole("staff");
    localStorage.setItem("bk_token", r.token);
    localStorage.setItem("bk_role", "staff");
    refresh(r.token);
  }

  function buzz(p = 12) { try { navigator.vibrate?.(p); } catch {} }
  function showToast(s: string) { setToast(s); setTimeout(() => setToast(""), 2500); }

  async function toggleMic() {
    if (listening) {
      setListening(false); setPhase("thinking");
      await session.current?.stop();
      session.current = null;
      setLevels(Array(9).fill(0));
      return;
    }
    setProposal(null); setResult(null); setTranscript(""); setDetected("");
    setLat({}); setUpiQr(null);
    const s = new VoiceSession();
    session.current = s;
    let miss = 0;
    s.onLevel = (rms) => {
      setLevels((old) => old.map((_, i) => {
        const gain = 1 + Math.abs(i - 4) / 4;         // edges livelier
        const target = Math.min(30, 4 + rms * 220 * gain);
        return target;
      }));
      miss = 0;
    };
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
      setListening(true); setPhase("listening"); buzz(8);
      // silence guard: no level + no transcript → hint
      setTimeout(() => {
        if (miss === 0 && session.current === s) {
          // only warn; user may still be about to speak
        }
      }, 0);
    } catch (e: any) {
      showToast(t.micFail);
      setListening(false); setPhase("idle");
    }
  }

  async function runCommand(text: string) {
    const t0 = performance.now();
    setPhase("thinking");
    try {
      const p = await api.command(text, lang);
      setLat((l) => ({ ...l, parse: Math.round(performance.now() - t0) }));
      setProposal(p);
      setPhase("idle");
      if (p.spoken && !p.needs_confirm) {
        const t1 = performance.now();
        setPhase("speaking");
        speak(p.spoken, lang).then(() =>
          setLat((l) => ({ ...l, tts: Math.round(performance.now() - t1) })))
          .finally(() => setPhase("idle"));
      }
    } catch (e: any) {
      showToast(t.parseFail);
      setPhase("idle");
    }
  }

  async function doConfirm(accept: boolean, method = "") {
    if (!proposal) return;
    setBusy(true);
    try {
      const r = await api.confirm(proposal.proposal_id, accept, method);
      if (r.written) {
        const link = r.confirm_path ? `${window.location.origin}${r.confirm_path}` : undefined;
        setResult({ text: r.spoken || "Done", link });
        if (method === "upi" && proposal.total_paise) {
          const u = await api.upi(proposal.total_paise);
          const qr = await QRCode.toDataURL(u.upi, { width: 240, margin: 1 });
          setUpiQr({ qr, link: u.upi });
        } else { setUpiQr(null); setPaySheet(false); }
        setProposal(null);
        if (method === "cash") setPaySheet(false);
        if (r.spoken) { setPhase("speaking");
          speak(r.spoken, lang).finally(() => setPhase("idle")); }
        buzz(25);
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

  /* ------------------------------------------------ login */
  if (!tok) {
    return (
      <main className="no-tabbar">
        <header className="topbar">
          <div className="brand">
            <h1>Bolo Khata</h1>
            <span className="tag">voice-first kirana ledger</span>
          </div>
          <div className="lang-tabs">
            {LANGS.map((l) => (
              <button key={l.k} className={lang === l.k ? "sel" : ""}
                onClick={() => setLang(l.k)} aria-label={"language " + l.k}>
                {l.label}</button>
            ))}
          </div>
        </header>
        <div className="card" style={{ textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontSize: 44 }}>🎙️📒</div>
          <div className="lead" style={{ margin: "8px 0 18px" }}>
            {lang === "te" ? "మాట్లాడండి — ఖాతా తానే రాస్తుంది"
              : lang === "en" ? "Speak — the khata writes itself"
              : "Boliye — khata khud likh jayega"}
          </div>
          <div className="row" style={{ marginBottom: 14 }}>
            <button className={loginMode === "owner" ? "primary grow" : "ghost grow"}
              onClick={() => setLoginMode("owner")}>🏪 Owner</button>
            <button className={loginMode === "staff" ? "primary grow" : "ghost grow"}
              onClick={() => setLoginMode("staff")}>👷 Staff</button>
          </div>
          {loginMode === "owner" ? (
            <div className="list">
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email" aria-label="owner email" />
              <input type="password" value={pw}
                onChange={(e) => setPw(e.target.value)} placeholder="password"
                aria-label="owner password" />
              <button className="primary big" onClick={doLogin}>Login →</button>
            </div>
          ) : (
            <div className="list">
              <input value={staffName} onChange={(e) => setStaffName(e.target.value)}
                placeholder={lang === "te" ? "పేరు" : "naam"} aria-label="staff name" />
              <input value={staffPin} onChange={(e) => setStaffPin(e.target.value)}
                placeholder="4-digit PIN" inputMode="numeric" maxLength={4}
                aria-label="staff PIN" />
              <button className="primary big" onClick={doStaffLogin}>Login →</button>
            </div>
          )}
        </div>
        <div className="powered">{t.powered}</div>
      </main>
    );
  }

  /* ------------------------------------------------ app */
  const TABS = [
    ["counter", "🎙️", t.counter], ["ledger", "📒", t.ledger],
    ["stock", "📦", t.stock], ["list", "📝", t.list],
    ["shop", "🏪", t.shop],
  ] as const;

  return (
    <main>
      {!online && <div className="offline-bar">{t.offline}</div>}
      <header className="topbar">
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <div className="lang-tabs">
            {LANGS.map((l) => (
              <button key={l.k} className={lang === l.k ? "sel" : ""}
                onClick={() => setLang(l.k)} aria-label={"language " + l.k}>
                {l.label}</button>
            ))}
          </div>
          <button className="ghost" style={{ padding: "8px 10px", minHeight: 40 }}
            onClick={toggleTheme} aria-label="toggle dark mode">
            {dark ? "☀️" : "🌙"}</button>
        </div>
      </header>

      {tab === "counter" && (<>
        {role === "staff" && (
          <div className="card" style={{ background: "var(--info-soft)",
            borderColor: "transparent" }}>
            {t.staffMode}
          </div>)}
        {role === "staff" && <StaffLeaveBanner />}

        {/* ------- mic stage: compacts so the receipt stays in frame ------- */}
        <div className={"mic-stage" + ((proposal || result) ? " compact" : "")}>
          <div className="transcript" aria-live="polite">
            {transcript
              ? transcript
              : <span className="ph">{t.placeholder}</span>}
          </div>
          <div className={"mic-orbit" + (listening ? " listening" : "")}>
            <span className="mic-ring" /><span className="mic-ring r2" />
            <button className={"big-mic" + (listening ? " on" : "")}
              onClick={toggleMic}
              aria-label={listening ? "stop listening" : "start listening"}>
              {listening ? "⏹" : "🎤"}
            </button>
          </div>
          <div className="wave" aria-hidden="true">
            {levels.map((h, i) => (
              <i key={i} className="bar"
                style={{ height: phase === "listening" ? h : 6 }} />
            ))}
          </div>
          <div className="mic-caption">
            {listening ? t.listening :
             phase === "thinking" ? t.thinking :
             phase === "speaking" ? t.speaking :
             transcript ? t.tap : t.idle}
          </div>
          <details className="debug">
            <summary>{t.debug}</summary>
            <div className="latency">
              {detected && <span>lang <b>{detected}</b></span>}
              <span>STT <b>{lat.stt ?? "—"}ms</b></span>
              <span>parse <b>{lat.parse ?? "—"}ms</b></span>
              <span>TTS <b>{lat.tts ?? "—"}ms</b></span>
            </div>
          </details>
        </div>

        {/* ------- proposal: receipt ------- */}
        {proposal && (
          <div className="receipt" ref={receiptRef}>
            <div className="row" style={{ justifyContent: "space-between",
              marginBottom: 8 }}>
              <span className="pill info">
                {proposal.kind === "bill" ? "🧾 bill" : "⚙️ " + proposal.intent}
              </span>
              <span className={"conf " +
                (proposal.confidence >= 0.85 ? "ok" :
                 proposal.confidence >= 0.6 ? "warn" : "bad")}>
                parse conf {(proposal.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {proposal.noise_hint &&
              <span className="noise-chip">🌫 noise — card check karo</span>}
            {proposal.customer_name && (
              <div style={{ margin: "6px 0 2px" }}>
                <span className="customer-chip">👤 {proposal.customer_name}</span>
              </div>)}
            {proposal.kind === "bill" && proposal.items?.length ? (
              <table>
                <tbody>
                  {proposal.items.map((i, idx) => (
                    <tr key={idx} className="slide-in"
                      style={{ animationDelay: `${idx * 70}ms` }}>
                      <td className="sr">{idx + 1}.</td>
                      <td>{icon(i.product_name || i.name)}{" "}
                        {i.product_name || i.name}</td>
                      <td className="num dim">{unitPrice(i)}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {inr(i.line_total_paise)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan={3}>Total</td>
                    <td className="num">{inr(proposal.total_paise)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: 18, margin: "8px 0", fontWeight: 600 }}>
                {proposal.description}</div>
            )}
            {!!proposal.unresolved?.length && (
              <div className="audio-note">⚠ unresolved:{" "}
                {proposal.unresolved.join(", ")}</div>)}
            <div className="audio-note" style={{ marginTop: 8 }}>
              🔊 “{proposal.spoken}”</div>
            {proposal.needs_confirm && (
              <div className="row wrap" style={{ marginTop: 12 }}>
                {proposal.kind === "bill" && (<>
                  <button className="ok big grow" disabled={busy}
                    onClick={() => setPaySheet(true)}>{t.paid} →</button>
                  <button className="primary big grow"
                    disabled={!proposal.customer_id || busy}
                    onClick={() => doConfirm(true, "khata")}>{t.khata}</button>
                </>)}
                {proposal.kind === "action" && (
                  <button className="ok big grow" disabled={busy}
                    onClick={() => doConfirm(true)}>{t.ok}</button>)}
                <button className="ghost" disabled={busy}
                  onClick={() => doConfirm(false)}>{t.no}</button>
              </div>)}
          </div>
        )}

        {/* ------- result ------- */}
        {result && (
          <div className="card celebrate">
            <div className="row" style={{ gap: 12 }}>
              <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                <circle cx="17" cy="17" r="16" fill="var(--ok-soft)" />
                <path className="check-draw" d="M10 17.5l5 5 9-11" fill="none"
                  stroke="var(--ok)" strokeWidth="3.4" strokeLinecap="round"
                  strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{result.text}</div>
            </div>
            {result.link && (<>
              <div className="dim" style={{ margin: "10px 0 6px" }}>
                {t.linkNote}</div>
              <a className="confirm-link" href={result.link} target="_blank"
                rel="noreferrer">{result.link}</a>
              <a className="confirm-link" style={{ marginTop: 8 }}
                href={`https://wa.me/?text=${encodeURIComponent(
                  "Aapka udhaar confirm karein: " + result.link)}`}
                target="_blank" rel="noreferrer">{t.shareWa}</a>
            </>)}
          </div>
        )}

        <div className="row">
          {role === "owner" &&
            <button className="ghost" onClick={doUndo}>{t.undo}</button>}
          <button className="ghost" onClick={() => refresh()}>
            {t.refresh} Refresh</button>
        </div>
      </>)}

      {tab === "ledger" && ledger && <LedgerPanel ledger={ledger}
        summary={summary} t={t} />}
      {tab === "stock" && ledger && <StockPanel />}
      {tab === "list" && <RemindersPanel t={t} />}
      {tab === "shop" && (<><ShopPanel t={t} /><LeavePanel /></>)}

      {/* ------- UPI / pay sheet ------- */}
      {paySheet && proposal && (
        <>
          <div className="sheet-back" onClick={() => setPaySheet(false)} />
          <div className="sheet" role="dialog" aria-label="payment">
            <h2 style={{ textAlign: "center" }}>
              {inr(proposal.total_paise)}</h2>
            <div className="dim" style={{ textAlign: "center",
              margin: "4px 0 14px" }}>
              {proposal.customer_name || "customer"}</div>
            {upiQr ? (
              <>
                <img className="qr" src={upiQr.qr} alt="UPI QR" width={210} />
                <div className="audio-note" style={{ textAlign: "center" }}>
                  {t.selfReport}</div>
                <button className="primary big grow" style={{ width: "100%",
                  marginTop: 14 }}
                  onClick={() => { setPaySheet(false); setUpiQr(null); }}>
                  {t.done}</button>
              </>) : (
              <div className="list">
                <button className="ok big" disabled={busy}
                  onClick={() => doConfirm(true, "cash")}>{t.cash}</button>
                <button className="primary big" disabled={busy}
                  onClick={() => doConfirm(true, "upi")}>{t.upi}</button>
              </div>)}
          </div>
        </>)}

      <nav className="tabbar" aria-label="main">
        <div className="tabs">
          {TABS.filter(([k]) => role === "owner" || k !== "shop")
            .map(([k, ic, lb]) => (
            <button key={k} className={tab === k ? "sel" : ""}
              onClick={() => setTab(k as any)} aria-label={lb}>
              <span className="tic" aria-hidden="true">{ic}</span>{lb}
            </button>))}
        </div>
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

/* ==================== panels ==================== */

function LedgerPanel({ ledger, summary, t }: any) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const filt = (n: string) => !ql || n.toLowerCase().includes(ql);
  const initials = (n: string) =>
    n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="card list">
      {summary && (
        <div className="card" style={{ background: "var(--primary-soft)",
          borderColor: "transparent", boxShadow: "none" }}>
          <div className="section-head" style={{ marginTop: 0 }}>
            {t.summary}</div>
          <div className="hero-num">{inr(summary.total_sales_paise)}</div>
          <div className="dim">
            {(Object.entries(summary.by_kind || {}) as
              [string, { count: number; amount_paise: number }][])
              .map(([k, v]) => `${k}: ${v.count} × ${inr(v.amount_paise)}`)
              .join(" · ")}</div>
        </div>)}
      <input value={q} onChange={(e) => setQ(e.target.value)}
        placeholder={"🔍 " + t.searchPh} aria-label="search customer" />
      <div className="section-head">{t.pendingH}</div>
      {ledger.pending?.filter((p: any) => filt(p.customer_name))
        .map((p: any) => (
        <div className="entry" key={p.id}>
          <span className="row">
            <span className="avatar">{initials(p.customer_name)}</span>
            {p.customer_name}
          </span>
          <span className="row" style={{ gap: 8 }}>
            <b className="bal due">{inr(p.amount_paise)}</b>
            <span className={"pill " + p.confirm_state}>{p.confirm_state}</span>
          </span>
        </div>))}
      {!ledger.pending?.length &&
        <div className="empty-state"><span className="em">✅</span>{t.none}</div>}
      <div className="section-head">{t.balancesH}</div>
      {ledger.balances?.filter((b: any) => filt(b.name)).map((b: any) => (
        <div className="entry" key={b.customer_id}>
          <span className="row">
            <span className="avatar">{initials(b.name)}</span>
            <span>{b.name}
              {b.trust && <span className="dim"
                title="confirmed share + payment history">
                {" "}· trust {b.trust.score}</span>}
            </span>
          </span>
          <b className={"bal " + (b.balance_paise > 0 ? "owe" : "paid")}>
            {inr(b.balance_paise)}</b>
        </div>))}
      <div className="section-head">{t.recentH}</div>
      {ledger.recent?.slice(0, 12).map((x: any) => (
        <div className="entry" key={x.id}>
          <span>{x.kind}{x.customer_name ? ` · ${x.customer_name}` : ""}</span>
          <span>{inr(x.amount_paise)}{" "}
            {x.confirm_state !== "none" && x.confirm_state !== "na" &&
              <span className={"pill " + x.confirm_state}>
                {x.confirm_state}</span>}</span>
        </div>))}
    </div>
  );
}

function StaffLeaveBanner() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.staffLeave()
    .then((r) => setItems(r.leave.filter((l: any) => l.state === "pending")))
    .catch(() => {});
  useEffect(() => { load(); }, []);
  if (!items.length) return null;
  return (
    <div className="card" style={{ background: "var(--warn-soft)",
      borderColor: "transparent" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        📋 Owner ne chutti mark ki — sahi hai?</div>
      {items.map((l) => (
        <div className="entry" key={l.id}>
          <span>{l.day} · by {l.marked_by}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="ok" style={{ minHeight: 48, minWidth: 48 }}
              aria-label="accept leave"
              onClick={async () => {
                await api.staffLeaveRespond(l.id, "accept"); load(); }}>✔</button>
            <button className="danger" style={{ minHeight: 48, minWidth: 48 }}
              aria-label="dispute leave"
              onClick={async () => {
                await api.staffLeaveRespond(l.id, "dispute"); load(); }}>✖</button>
          </span>
        </div>))}
    </div>
  );
}

function LeavePanel() {
  const [items, setItems] = useState<any[]>([]);
  const load = () => api.leave()
    .then((r) => setItems(r.leave)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  if (!items.length) return null;
  return (
    <div className="card list">
      <div className="section-head">📋 Staff leave — dual approval</div>
      {items.map((l) => (
        <div className="entry" key={l.id}>
          <span className="row">
            <span className="avatar">{l.staff_name?.[0] || "?"}</span>
            <span>{l.staff_name} · {l.day}
              <span className="dim"> · by {l.marked_by}</span></span>
          </span>
          <span className={"pill " +
            (l.state === "accepted" ? "confirmed" :
             l.state === "disputed" ? "disputed" : "pending")}>
            {l.state}</span>
        </div>))}
    </div>
  );
}

function RemindersPanel({ t }: any) {
  const [rems, setRems] = useState<any[]>([]);
  const load = () => api.reminders()
    .then((r) => setRems(r.reminders)).catch(() => {});
  useEffect(() => { load(); }, []);
  const restock = rems.filter((r) => r.kind === "restock");
  const others = rems.filter((r) => r.kind !== "restock");
  const Tick = ({ id }: { id: number }) => (
    <button aria-label="mark done"
      style={{ minHeight: 44, minWidth: 44, fontSize: 18, borderRadius: 12,
        background: "var(--ok-soft)", color: "var(--ok)",
        border: "2px solid var(--ok)", fontWeight: 800 }}
      onClick={async () => { await api.reminderDone(id); load(); }}>✔</button>);
  return (
    <div className="card list">
      <div className="section-head">📝 {t.restockH}</div>
      <div className="dim">{t.restockSub}</div>
      {restock.map((r) => {
        const p = JSON.parse(r.payload || "{}");
        return (
          <div className="entry" key={r.id}>
            <span>{(p.items || []).map(
              (i: any) => `${i.qty} ${i.unit} ${i.name}`).join("; ") ||
              p.text}</span>
            <Tick id={r.id} />
          </div>);
      })}
      {!restock.length && (
        <div className="empty-state"><span className="em">🧺</span>
          empty — bolo “next time 20 kilo gehu mangwana”</div>)}
      <div className="section-head">🔔 {t.remH}</div>
      {others.map((r) => (
        <div className="entry" key={r.id}>
          <span>{r.customer_name ? `${r.customer_name} ko yaad dilao`
            : JSON.parse(r.payload || "{}").text}</span>
          <Tick id={r.id} />
        </div>))}
      {!others.length && <div className="dim">none</div>}
      <DeliveriesPanel t={t} />
    </div>
  );
}

function DeliveriesPanel({ t }: any) {
  const [subs, setSubs] = useState<any[]>([]);
  const [on, setOn] = useState(true);
  const load = () => api.deliveries()
    .then((r) => setSubs(r.subscriptions)).catch(() => {});
  useEffect(() => {
    load();
    api.shop().then((s) =>
      setOn(s.modules?.delivery !== false)).catch(() => {});
  }, []);
  if (!on || !subs.length) return null;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), today = now.getDate();
  const dim = new Date(y, m + 1, 0).getDate();
  return (
    <>
      <div className="section-head">🥛 {t.delH}</div>
      {subs.map((s) => (
        <div key={s.id} className="card" style={{ padding: 14,
          background: "var(--card2)", boxShadow: "none",
          borderColor: "transparent" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{s.customer} — {s.product} {s.qty_per_day}/{s.unit}/din</b>
            <b className="bal">₹{(s.month_total_paise / 100).toFixed(0)}</b>
          </div>
          <div className="cal" role="img"
            aria-label={`delivery calendar, ${s.days_skipped} skips`}>
            {Array.from({ length: dim }, (_, i) => {
              const d = i + 1;
              const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const skipped = (s.skipped || []).includes(iso);
              const cls = d > today ? "future" : skipped ? "skip" : "";
              return <span key={d} className={"d " + cls}
                title={skipped ? "skipped" : d <= today ? "delivered" : ""}>
                {d}</span>;
            })}
          </div>
          <div className="cal-legend">
            <span>■ delivered</span><span style={{ color: "var(--bad)" }}>
              ■ skipped</span><span className="dim">■ aage</span>
          </div>
        </div>))}
      <div className="audio-note">tap nahi — bolo “Ramesh ka doodh kal se
        2 din nahi chahiye” ya “dudh ka bill”</div>
      <WeeklyCard t={t} />
    </>
  );
}

function WeeklyCard({ t }: any) {
  const [w, setW] = useState<any>(null);
  useEffect(() => { api.weekly().then(setW).catch(() => {}); }, []);
  if (!w) return null;
  return (
    <>
      <div className="section-head">📈 {t.weekH}</div>
      <div className="entry"><span>Top bikri</span>
        <span>{w.top_sellers.map((x: any) => x.name).join(", ") || "—"}</span></div>
      {w.running_out.map((r: any) => (
        <div className="entry" key={r.name}>
          <span>⚠️ {r.name} khatam</span>
          <b className="bal due">~{r.days_left} din</b></div>))}
      {w.top_debtors.map((d: any) => (
        <div className="entry" key={d.name}>
          <span>💰 {d.name} udhaar</span>
          <b className="bal owe">{inr(d.balance_paise)}</b></div>))}
      <div className="audio-note">bolo “is hafte ka hisaab batao”</div>
    </>
  );
}

function ShopPanel({ t }: any) {
  const [shop, setShop] = useState<any>(null);
  const [qr, setQr] = useState("");
  useEffect(() => {
    api.shop().then(async (s) => {
      setShop(s);
      const url = `${window.location.origin}/join/${s.join_code}`;
      setQr(await QRCode.toDataURL(url, { width: 220, margin: 1 }));
    }).catch(() => {});
  }, []);
  const TYPES: Record<string, [string, string]> = {
    kirana: ["🛒", "Kirana"], milk: ["🥛", "Milk delivery"],
    newspaper: ["📰", "Newspaper"], fruit_veg: ["🍅", "Fruit/veg"],
    other: ["🧩", "Other"],
  };
  const ALL_MODS = ["ledger", "stock", "billing", "delivery", "staff",
                    "reminders", "upi"];
  const [bt, setBt] = useState("");
  const [mods, setMods] = useState<Record<string, boolean>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (shop) { setBt(shop.business_type);
      setMods(shop.modules || {}); setLabels(shop.config?.labels || {}); }
  }, [shop]);
  if (!shop) return <div className="card"><div className="skeleton"
    style={{ height: 80 }} /></div>;
  return (
    <div className="card list" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{shop.name}</div>
      <div className="chip-row" style={{ justifyContent: "center" }}>
        {Object.entries(TYPES).map(([k, [ic, v]]) => (
          <button key={k} className={"chip" + (bt === k ? " sel" : "")}
            style={bt === k ? { background: "var(--primary)",
              color: "var(--primary-ink)", borderColor: "transparent" } : {}}
            onClick={() => setBt(k)}>{ic} {v}</button>))}
      </div>
      <button className="primary" onClick={async () => {
        try {
          await api.setShopConfig(bt, bt === "other" ? mods : {}, labels);
          setSaved("saved ✔");
          const s = await api.shop(); setShop(s);
        } catch (e: any) { setSaved(e?.message || "failed"); }
      }}>Save</button>
      {saved && <div className="dim">{saved}</div>}
      {bt === "other" && (
        <div style={{ textAlign: "left" }}>
          <div className="dim">Modules (fixed list — pick what fits):</div>
          {ALL_MODS.filter((m) => m !== "ledger").map((m) => (
            <label key={m} className="row" style={{ gap: 8, minHeight: 44 }}>
              <input type="checkbox" style={{ width: 22, height: 22,
                minHeight: 0 }}
                checked={!!mods[m]}
                onChange={(e) =>
                  setMods({ ...mods, [m]: e.target.checked })} />
              {m}</label>))}
          <div className="dim">Labels (optional rename):</div>
          <input placeholder="e.g. item = dibba"
            value={labels.item || ""}
            onChange={(e) => setLabels({ ...labels, item: e.target.value })} />
        </div>)}
      {bt !== "other" && shop.modules && (
        <div className="chip-row" style={{ justifyContent: "center" }}>
          {Object.entries(shop.modules).filter(([, v]) => v).map(([k]) => (
            <span key={k} className="pill info">{k}</span>))}
        </div>)}
      <div className="section-head" style={{ justifyContent: "center" }}>
        {t.joinQr}</div>
      {qr && <img className="qr" src={qr} alt="Join QR" width={200} />}
      <div className="confirm-link">
        {typeof window !== "undefined" &&
          `${window.location.origin}/join/${shop.join_code}`}</div>
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
  if (!cat) return (
    <div className="card list">
      {[0, 1, 2, 3].map((i) =>
        <div key={i} className="skeleton" style={{ height: 40 }} />)}
    </div>);
  const maxStock = Math.max(...cat.products.map((p: any) => p.stock), 1);
  return (
    <div className="card list">
      {reo?.suggestions?.length ? (
        <div className="reorder-card">
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            ⚠ Reorder soon</div>
          {reo.suggestions.map((s: any) => (
            <div className="entry" key={s.product_id}>
              <span>{s.name_en} · {s.days_left}d left</span>
              <b>order {s.qty} {s.unit}</b>
            </div>))}
        </div>) : null}
      <div className="section-head">Stock</div>
      {cat.products.map((p: any) => {
        const low = p.stock <= p.reorder_point;
        return (
          <div className="entry" key={p.id}>
            <span>{icon(p.name_en)} {p.name_en}
              <span className="dim"> · {inr(p.price_paise)}/{p.unit}</span></span>
            <span className="row" style={{ gap: 8 }}>
              <span className={"stockbar" + (low ? " low" : "")}>
                <i style={{ width: `${Math.max(6,
                  (p.stock / maxStock) * 100)}%` }} /></span>
              <span className={low ? "pill disputed" : ""}
                style={{ minWidth: 64, textAlign: "right", fontWeight: 700,
                  whiteSpace: "nowrap" }}>
                {p.stock} {p.unit}</span>
            </span>
          </div>);
      })}
    </div>
  );
}
