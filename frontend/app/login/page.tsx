"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, setToken } from "../lib/api";
import { OAuthButtons } from "../lib/oauth";
import { LANG_OPTIONS, pick, useLang } from "../lib/i18n";
import { StoreIcon, UserIcon } from "../lib/icons";

const S = {
  title: { hi: "Login karo", te: "లాగిన్", en: "Log in" },
  owner: { hi: "Dukaan wala", te: "దుకాణదారు", en: "Owner" },
  staff: { hi: "Assistant", te: "అసిస్టెంట్", en: "Assistant" },
  show: { hi: "dikhao", te: "చూపు", en: "show" },
  hide: { hi: "chhupao", te: "దాచు", en: "hide" },
  err: { hi: "Login nahi hua — details check karo",
         te: "లాగిన్ కాలేదు — వివరాలు చూడండి",
         en: "Couldn't log in — check your details" },
  forgot: { hi: "Password bhool gaye? Shop admin se reset karwao (deployment docs me tareeka hai).",
            te: "పాస్‌వర్డ్ మర్చిపోయారా? అడ్మిన్ ద్వారా రీసెట్ చేయించండి.",
            en: "Forgot password? Ask the shop admin to reset it (steps in the deploy docs)." },
  newHere: { hi: "Naya ho?", te: "కొత్తవారా?", en: "New here?" },
  create: { hi: "Account banao", te: "అకౌంట్ చేయి", en: "Create account" },
  invitePh: { hi: "ya invite code se judo", te: "లేదా ఇన్‌వైట్ కోడ్",
              en: "or join with an invite code" },
  name: { hi: "naam", te: "పేరు", en: "name" },
  pin: "4-digit PIN",
  go: { hi: "Login", te: "లాగిన్", en: "Log in" },
};

export default function Login() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [mode, setMode] = useState<"owner" | "staff">("owner");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [invite, setInvite] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function ok(tok: string, role: string, needsOnboard: boolean) {
    setToken(tok);
    localStorage.setItem("bk_token", tok);
    localStorage.setItem("bk_role", role);
    router.replace(needsOnboard ? "/onboarding" : "/app");
  }

  async function doOwner() {
    setBusy(true); setErr("");
    try {
      // try real account first, fall back to the seeded demo owner
      try {
        const r = await api.sessionLogin(email, pw);
        return ok(r.token, "owner", r.needs_onboarding);
      } catch {
        const r = await api.login(email, pw);
        return ok(r.token, "owner", false);
      }
    } catch {
      setErr(pick(lang, S.err));
    } finally { setBusy(false); }
  }

  async function doStaff() {
    setBusy(true); setErr("");
    try {
      if (invite.trim()) {
        const r = await api.staffRegister(invite.trim(), pin);
        return ok(r.token, "staff", false);
      }
      const r = await api.staffLogin(name, pin);
      return ok(r.token, "staff", false);
    } catch {
      setErr(pick(lang, S.err));
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
        <h1 className="title" style={{ textAlign: "center" }}>
          {pick(lang, S.title)}</h1>
        <div className="seg" style={{ width: "100%" }}>
          <button className={mode === "owner" ? "sel grow" : "grow"}
            onClick={() => setMode("owner")}>
            <StoreIcon size={18} /> {pick(lang, S.owner)}</button>
          <button className={mode === "staff" ? "sel grow" : "grow"}
            onClick={() => setMode("staff")}>
            <UserIcon size={18} /> {pick(lang, S.staff)}</button>
        </div>
        {err && <div className="banner" style={{
          background: "var(--bad-soft)", width: "100%" }}>{err}</div>}
        {mode === "owner" ? (
          <div className="list" style={{ width: "100%" }}>
            <input value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email" type="email" autoComplete="email"
              aria-label="email" />
            <div className="row" style={{ gap: 8 }}>
              <input type={showPw ? "text" : "password"} value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="password" aria-label="password"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && doOwner()}
                style={{ flex: 1 }} />
              <button className="link" style={{ flexShrink: 0 }}
                onClick={() => setShowPw((s) => !s)}>
                {showPw ? pick(lang, S.hide) : pick(lang, S.show)}</button>
            </div>
            <button className="primary big" disabled={busy}
              onClick={doOwner}>{pick(lang, S.go)}</button>
            <div className="caption">{pick(lang, S.forgot)}</div>
            <OAuthButtons next="/login" />
          </div>
        ) : (
          <div className="list" style={{ width: "100%" }}>
            <input value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder={pick(lang, S.invitePh)} aria-label="invite code" />
            {!invite && (
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={pick(lang, S.name)} aria-label="staff name" />)}
            <input value={pin} onChange={(e) => setPin(e.target.value)}
              placeholder={invite ? "naya " + S.pin : S.pin}
              inputMode="numeric" maxLength={4} aria-label="PIN"
              onKeyDown={(e) => e.key === "Enter" && doStaff()} />
            <button className="primary big" disabled={busy}
              onClick={doStaff}>{pick(lang, S.go)}</button>
          </div>
        )}
        <div className="caption" style={{ marginTop: 8 }}>
          {pick(lang, S.newHere)}{" "}
          <Link href="/start" className="link">{pick(lang, S.create)}</Link>
        </div>
      </div>
    </main>
  );
}
