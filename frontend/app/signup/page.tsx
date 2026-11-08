"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../lib/api";
import { LANG_OPTIONS, pick, useLang } from "../lib/i18n";
import { StoreIcon, UserIcon } from "../lib/icons";

const S = {
  ownerTitle: { hi: "Apni dukaan ka account", te: "మీ దుకాణం అకౌంట్",
                en: "Your shop account" },
  custTitle: { hi: "Customer account", te: "కస్టమర్ అకౌంట్",
               en: "Customer account" },
  owner: { hi: "Dukaan wala", te: "దుకాణదారు", en: "Owner" },
  cust: { hi: "Customer", te: "కస్టమర్", en: "Customer" },
  namePh: { hi: "aapka naam", te: "మీ పేరు", en: "your name" },
  emailPh: "email",
  pwPh: { hi: "password (8+ akshar, ek number)",
          te: "పాస్‌వర్డ్ (8+, ఒక నంబర్)",
          en: "password (8+ chars, one number)" },
  show: { hi: "dikhao", te: "చూపు", en: "show" },
  hide: { hi: "chhupao", te: "దాచు", en: "hide" },
  pinPh: "4-digit PIN",
  contactPh: { hi: "phone ya email (optional)",
               te: "ఫోన్ లేదా ఈమెయిల్ (ఐచ్ఛికం)",
               en: "phone or email (optional)" },
  codePh: { hi: "dukaan code (QR ke neeche likha hai)",
            te: "దుకాణం కోడ్ (QR కింద ఉంటుంది)",
            en: "shop code (printed under the QR)" },
  next: { hi: "Aage badho", te: "కొనసాగండి", en: "Continue" },
  have: { hi: "Account hai?", te: "అకౌంట్ ఉందా?", en: "Have an account?" },
  login: { hi: "Login", te: "లాగిన్", en: "Log in" },
  errTaken: { hi: "Ye naam/email pehle se hai — login karo",
              te: "ఈ పేరు/ఈమెయిల్ ఉంది — లాగిన్ చేయండి",
              en: "That name/email is taken — log in" },
  err: { hi: "Kuch gadbad — details check karo",
         te: "ఏదో తప్పు — వివరాలు చూడండి",
         en: "Something's off — check the details" },
};

export default function Signup() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [role, setRole] = useState<"owner" | "customer">("owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pin, setPin] = useState("");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("role");
    if (r === "customer") setRole("customer");
    const j = new URLSearchParams(window.location.search).get("join");
    if (j) setCode(j);
  }, []);

  async function doOwner() {
    setBusy(true); setErr("");
    try {
      const r = await api.signup(email, pw, name);
      setToken(r.token);
      localStorage.setItem("bk_token", r.token);
      localStorage.setItem("bk_role", "owner");
      router.replace("/onboarding");
    } catch (e: any) {
      setErr(String(e?.message || "").includes("409")
        ? pick(lang, S.errTaken) : pick(lang, S.err));
    } finally { setBusy(false); }
  }

  async function doCustomer() {
    setBusy(true); setErr("");
    try {
      const r = await api.custSignup(name, pin, contact, code);
      setToken(r.token);
      localStorage.setItem("bk_cust_token", r.token);
      router.replace("/m");
    } catch (e: any) {
      setErr(String(e?.message || "").includes("409")
        ? pick(lang, S.errTaken) : pick(lang, S.err));
    } finally { setBusy(false); }
  }

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata</div>
        <div className="seg" role="tablist" aria-label="language">
          {LANG_OPTIONS.map((l) => (
            <button key={l.k} className={lang === l.k ? "sel" : ""}
              onClick={() => setLang(l.k)} aria-label={"language " + l.k}>
              {l.sub}</button>
          ))}
        </div>
      </header>
      <div className="flow-page" style={{ maxWidth: 420 }}>
        <div className="seg" style={{ width: "100%" }}>
          <button className={role === "owner" ? "sel grow" : "grow"}
            onClick={() => setRole("owner")}>
            <StoreIcon size={18} /> {pick(lang, S.owner)}</button>
          <button className={role === "customer" ? "sel grow" : "grow"}
            onClick={() => setRole("customer")}>
            <UserIcon size={18} /> {pick(lang, S.cust)}</button>
        </div>
        <h1 className="title" style={{ textAlign: "center" }}>
          {pick(lang, role === "owner" ? S.ownerTitle : S.custTitle)}</h1>
        {err && <div className="banner" style={{
          background: "var(--bad-soft)", width: "100%" }}>{err}</div>}
        <div className="list" style={{ width: "100%" }}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder={pick(lang, S.namePh)} aria-label="name" />
          {role === "owner" ? (<>
            <input value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={S.emailPh} type="email" autoComplete="email"
              aria-label="email" />
            <div className="row" style={{ gap: 8 }}>
              <input type={showPw ? "text" : "password"} value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder={pick(lang, S.pwPh)} aria-label="password"
                autoComplete="new-password" style={{ flex: 1 }} />
              <button className="link" style={{ flexShrink: 0 }}
                onClick={() => setShowPw((s) => !s)}>
                {showPw ? pick(lang, S.hide) : pick(lang, S.show)}</button>
            </div>
          </>) : (<>
            <input value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder={S.pinPh} inputMode="numeric" maxLength={4}
              aria-label="PIN" />
            <input value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={pick(lang, S.contactPh)} aria-label="contact" />
            <input value={code} onChange={(e) => setCode(e.target.value)}
              placeholder={pick(lang, S.codePh)} aria-label="shop code" />
          </>)}
          <button className="primary big" disabled={busy}
            onClick={role === "owner" ? doOwner : doCustomer}>
            {pick(lang, S.next)}</button>
        </div>
        <div className="caption" style={{ marginTop: 8 }}>
          {pick(lang, S.have)}{" "}
          <Link href={role === "customer" ? "/m" : "/login"}
            className="link">{pick(lang, S.login)}</Link>
        </div>
      </div>
    </main>
  );
}
