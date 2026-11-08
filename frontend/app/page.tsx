"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LANG_OPTIONS, pick, useLang } from "./lib/i18n";
import { MicIcon, CheckIcon, BookIcon, StoreIcon, BoxIcon,
         ListIcon } from "./lib/icons";

/* Landing — the first thing a judge sees. Public; logged-in owners get
   a straight path into /app. Video is the real recorded hero flow. */

const S = {
  headline: { hi: "Bolo. Khata likh gaya.",
              te: "చెప్పండి. ఖాతా రాసేసింది.",
              en: "Speak. The khata is written." },
  sub: { hi: "Dukaan pe mic dabao — bill, stock aur udhaar khud update. Customer ko confirm link milta hai.",
         te: "దుకాణంలో మైక్ నొక్కండి — బిల్, స్టాక్, ఉధార్ అన్నీ అప్డేట్. కస్టమర్ కు నిర్ధారణ లింక్ వస్తుంది.",
         en: "Tap the mic at your shop — bills, stock and udhaar update themselves. Customers get a confirm link." },
  ownerCta: { hi: "Main dukaan wala hoon", te: "నేను దుకాణదారుని", en: "I'm a shopkeeper" },
  custCta: { hi: "Main customer hoon", te: "నేను కస్టమర్", en: "I'm a customer" },
  how: { hi: "Kaise kaam karta hai", te: "ఇది ఎలా పనిచేస్తుంది", en: "How it works" },
  steps: [
    { hi: ["Bolo", "Hinglish ya Telugu me — shor wali dukaan me bhi."],
      te: ["చెప్పండి", "హింగ్లిష్ లేదా తెలుగులో — శబ్దంతో కూడా."],
      en: ["Speak", "Hinglish or Telugu — even in a noisy shop."] },
    { hi: ["Bill ban gaya", "Item, daam aur khata — sab aapke saamne, pehle confirm."],
      te: ["బిల్ తయారైంది", "వస్తువు, ధర, ఖాతా — ముందు మీరే నిర్ధారించండి."],
      en: ["Bill's ready", "Items, prices and khata — you confirm first."] },
    { hi: ["Customer ne confirm kiya", "Unko link milta hai — dono taraf same hisaab."],
      te: ["కస్టమర్ నిర్ధారిస్తారు", "వారికి లింక్ వస్తుంది — రెండు వైపులా ఒకే లెక్క."],
      en: ["Customer confirms", "They get a link — same ledger on both sides."] },
  ],
  problem: { hi: "Register me likha udhaar — mahine ke aakhir me jhagda. \"Maine kab liya?\"",
             te: "రిజిస్టర్ లో ఉధార్ — నెల చివర గొడవ. \"నేను ఎప్పుడు తీసుకున్నా?\"",
             en: "Udhaar in a paper register — and the month-end \"when did I take that?\" argument." },
  trust: {
    hi: ["Dono taraf confirmation — koi chori nahi", "Customer ko app nahi chahiye — link se kaam",
         "Shor wali dukaan me bhi chale", "Hinglish + Telugu + English"],
    te: ["రెండు వైపులా నిర్ధారణ — మోసం లేదు", "కస్టమర్ కు యాప్ అక్కర్లేదు — లింక్ చాలు",
         "శబ్దంతో కూడిన దుకాణంలో కూడా", "హింగ్లిష్ + తెలుగు + ఇంగ్లిష్"],
    en: ["Two-sided confirmation — no cheating", "Customers need no app — just a link",
         "Works in a noisy shop", "Hinglish + Telugu + English"],
  },
  types: { hi: "Har tarah ki dukaan", te: "అన్ని రకాల దుకాణాలు", en: "Every kind of dukaan" },
  typeList: ["Kirana", "Doodh wala", "Akhbar wala", "Sabzi-phal", "Aur bhi"],
  footer: { hi: "Gnani AI ke Prisma + Timbre par bana · IIT Bhilai",
            te: "Gnani AI Prisma + Timbre తో · IIT భిలాయ్",
            en: "Built on Gnani AI Prisma + Timbre · IIT Bhilai" },
  tryIt: { hi: "Bina login try karo", te: "లాగిన్ లేకుండా చూడండి",
           en: "Try it without login" },
  login: { hi: "Login", te: "లాగిన్", en: "Log in" },
};

const TYPE_ICONS = [StoreIcon, BoxIcon, ListIcon, ListIcon, StoreIcon];

export default function Landing() {
  const router = useRouter();
  const [lang, setLang] = useLang();

  useEffect(() => {
    // logged-in owners go straight to the counter
    if (localStorage.getItem("bk_token")) router.replace("/app");
  }, [router]);

  return (
    <main className="no-tabbar landing">
      <header className="topbar">
        <div className="wordmark">Bolo Khata</div>
        <div className="row" style={{ gap: 8 }}>
          <div className="seg" role="tablist" aria-label="language">
            {LANG_OPTIONS.map((l) => (
              <button key={l.k} className={lang === l.k ? "sel" : ""}
                onClick={() => setLang(l.k)} aria-label={"language " + l.k}>
                {lang === "te" ? l.label : l.sub}</button>
            ))}
          </div>
          <Link className="link" href="/login" style={{ fontWeight: 700 }}>
            {pick(lang, S.login)}</Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1 className="display-xl">{pick(lang, S.headline)}</h1>
          <p className="hero-sub">{pick(lang, S.sub)}</p>
          <div className="hero-ctas">
            <Link href="/start?role=owner" className="primary big">
              <StoreIcon size={22} />{pick(lang, S.ownerCta)}</Link>
            <Link href="/start?role=customer" className="big tonal">
              {pick(lang, S.custCta)}</Link>
          </div>
          <Link href="/try" className="link" style={{ fontSize: 14 }}>
            {pick(lang, S.tryIt)} →</Link>
        </div>
        <div className="hero-video">
          <video src="/hero-flow.webm" autoPlay muted loop playsInline
            aria-label="recorded demo of the voice billing flow" />
          <div className="caption" style={{ textAlign: "center" }}>
            recorded demo</div>
        </div>
      </section>

      <div className="rangoli" aria-hidden="true" />

      <section className="lp-section">
        <h2 className="lp-h2">{pick(lang, S.how)}</h2>
        <div className="steps3">
          {S.steps.map((s, i) => (
            <div key={i} className="step-card">
              <div className="step-num">{i + 1}</div>
              {i === 0 && <MicIcon size={30} />}
              {i === 1 && <BookIcon size={30} />}
              {i === 2 && <CheckIcon size={30} />}
              <b>{pick(lang, s)[0]}</b>
              <span>{pick(lang, s)[1]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section problem-strip">
        <p className="problem-line">{pick(lang, S.problem)}</p>
      </section>

      <section className="lp-section">
        <div className="trust-grid">
          {pick(lang, S.trust).map((x, i) => (
            <div key={i} className="trust-row">
              <span className="trust-tick"><CheckIcon size={18} /></span>
              <span>{x}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section">
        <h2 className="lp-h2">{pick(lang, S.types)}</h2>
        <div className="type-row">
          {S.typeList.map((x, i) => {
            const Ic = TYPE_ICONS[i];
            return <div key={x} className="type-chip"><Ic size={20} />{x}</div>;
          })}
        </div>
      </section>

      <footer className="lp-footer">
        <div>{pick(lang, S.footer)}</div>
        <div className="row" style={{ justifyContent: "center", gap: 20 }}>
          <Link href="/about">/about</Link>
          <Link href="/benchmark">/benchmark</Link>
          <Link href="/try">/try</Link>
        </div>
      </footer>
    </main>
  );
}
