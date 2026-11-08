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
    <main>
      <h1>Bolo Khata <small>customer join</small></h1>
      <div className="card list">
        {err && <div>{err}</div>}
        {done ? (
          <div style={{ fontSize: 18 }}>
            ✅ <b>{name}</b>, aap <b>{shop}</b> ke khata mein jud gaye.
            Ab dukaan aapko udhaar confirm links bhej sakti hai.
          </div>
        ) : shop && (
          <>
            <div style={{ fontSize: 18 }}>
              <b>{shop}</b> mein apna khata kholo
            </div>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Aapka naam" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)" inputMode="tel" />
            <input value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder="4-digit PIN — apna khata app ke liye (optional)"
              inputMode="numeric" maxLength={4} />
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="hinglish">Hinglish</option>
              <option value="te">తెలుగు</option>
              <option value="en">English</option>
            </select>
            <button className="primary" disabled={busy || !name.trim()}
              onClick={submit}>Join</button>
            <div className="audio-note">
              Sirf naam + shop ka link. Koi install nahi, koi OTP nahi.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
