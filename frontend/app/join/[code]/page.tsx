"use client";

import { use, useState } from "react";
import { api } from "../../lib/api";

export const dynamic = "force-dynamic";

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = use(params);
  const [shop, setShop] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [lang, setLang] = useState("hinglish");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useState(() => {
    api.joinInfo(code)
      .then((d) => setShop(d.shop_name))
      .catch(() => setErr("Ye join link invalid hai."));
  });

  async function submit() {
    setBusy(true);
    try {
      const r = await api.joinShop(code, name, phone, lang, pin);
      if (r.token) {
        localStorage.setItem("bk_cust", r.token);
        window.location.href = "/m";
        return;
      }
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata
          <span className="sub">customer join</span>
        </div>
      </header>
      <div className="surface list" style={{ padding: "24px 20px" }}>
        {err && <div className="banner" style={{ borderColor: "var(--bad)",
          background: "var(--bad-soft)" }}><b>Oops</b>{err}</div>}
        {done ? (
          <div style={{ textAlign: "center" }}>
            <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true"
              style={{ margin: "0 auto" }}>
              <circle cx="28" cy="28" r="26" fill="var(--ok-soft)" />
              <path className="check-draw" d="M17 29l7 7 15-18" fill="none"
                stroke="var(--ok)" strokeWidth="4.5" strokeLinecap="round"
                strokeLinejoin="round" />
            </svg>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 10 }}>
              <b>{name}</b>, aap <b>{shop}</b> ke khata mein jud gaye.</div>
            <div className="dim" style={{ marginTop: 6 }}>
              Ab dukaan aapko udhaar confirm links bhej sakti hai.</div>
          </div>
        ) : shop && (
          <>
            <div style={{ fontSize: 18, textAlign: "center" }}>
              <b>{shop}</b> mein apna khata kholo</div>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Aapka naam" aria-label="your name" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)" inputMode="tel"
              aria-label="phone (optional)" />
            <input value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN — khata app ke liye (optional)"
              inputMode="numeric" maxLength={4} aria-label="optional PIN" />
            <select value={lang} onChange={(e) => setLang(e.target.value)}
              aria-label="preferred language">
              <option value="hinglish">Hinglish</option>
              <option value="te">తెలుగు</option>
              <option value="en">English</option>
            </select>
            <button className="primary big" disabled={busy || !name.trim()}
              onClick={submit}>Join →</button>
            <div className="audio-note" style={{ textAlign: "center" }}>
              Sirf naam + shop ka link. Koi install nahi, koi OTP nahi.
              PIN doge to apna khata app /m pe bhi khulega.
            </div>
          </>
        )}
      </div>
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
