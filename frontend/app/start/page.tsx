"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LANG_OPTIONS, pick, useLang } from "../lib/i18n";
import { StoreIcon, UserIcon } from "../lib/icons";

const S = {
  langQ: { hi: "Apni bhasha chunein", te: "మీ భాష ఎంచుకోండి",
           en: "Choose your language" },
  roleQ: { hi: "Aap kaun hain?", te: "మీరు ఎవరు?", en: "Who are you?" },
  owner: { hi: "Dukaan wala / Service provider",
           te: "దుకాణదారు / సర్వీస్ ప్రొవైడర్",
           en: "Shopkeeper / Service provider" },
  ownerSub: { hi: "Bill, khata, stock — sab voice se",
              te: "బిల్, ఖాతా, స్టాక్ — వాయిస్ తో",
              en: "Bills, khata, stock — all by voice" },
  cust: { hi: "Customer", te: "కస్టమర్", en: "Customer" },
  custSub: { hi: "Apna khata dekho, dukaan se judo",
             te: "మీ ఖాతా చూడండి, దుకాణంతో కలవండి",
             en: "See your khata, join a shop" },
  back: { hi: "← wapas", te: "← వెనక్కి", en: "← back" },
};

export default function Start() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [langPicked, setLangPicked] = useState(true);

  useEffect(() => {
    // language is asked once — the very first thing on a fresh device
    setLangPicked(!!localStorage.getItem("bk_lang"));
    const role = new URLSearchParams(window.location.search).get("role");
    if (role && localStorage.getItem("bk_lang")) {
      router.replace(role === "customer" ? "/signup?role=customer"
                                         : "/signup?role=owner");
    }
  }, [router]);

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata</div>
        {langPicked && (
          <button className="link" onClick={() => setLangPicked(false)}>
            {pick(lang, { hi: "bhasha", te: "భాష", en: "language" })}
          </button>)}
      </header>
      <div className="flow-page">
        {!langPicked ? (<>
          <h1 className="title" style={{ textAlign: "center" }}>
            {pick(lang, S.langQ)}</h1>
          <div className="lang-cards">
            {LANG_OPTIONS.map((l) => (
              <button key={l.k} className="choice-card"
                onClick={() => { setLang(l.k); setLangPicked(true); }}>
                <span className="choice-big">{l.label}</span>
                <span className="caption">{l.sub}</span>
              </button>
            ))}
          </div>
        </>) : (<>
          <h1 className="title" style={{ textAlign: "center" }}>
            {pick(lang, S.roleQ)}</h1>
          <div className="lang-cards">
            <button className="choice-card"
              onClick={() => router.push("/signup?role=owner")}>
              <StoreIcon size={36} />
              <span className="choice-big">{pick(lang, S.owner)}</span>
              <span className="caption">{pick(lang, S.ownerSub)}</span>
            </button>
            <button className="choice-card"
              onClick={() => router.push("/signup?role=customer")}>
              <UserIcon size={36} />
              <span className="choice-big">{pick(lang, S.cust)}</span>
              <span className="caption">{pick(lang, S.custSub)}</span>
            </button>
          </div>
          <Link href="/" className="link" style={{ alignSelf: "center" }}>
            {pick(lang, S.back)}</Link>
        </>)}
      </div>
    </main>
  );
}
