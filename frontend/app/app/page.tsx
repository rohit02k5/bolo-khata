"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, inr, setToken, speak, WS_URL, Proposal } from "../lib/api";
import { VoiceSession } from "../lib/mic";
import {
  MicIcon, StopIcon, BookIcon, BoxIcon, ListIcon, StoreIcon,
  UndoIcon, RefreshIcon, MoonIcon, SunIcon, DotsIcon, SpeakerIcon,
  CashIcon, UpiIcon, CheckIcon, XIcon, SearchIcon, UserIcon,
  OutIcon, ChartIcon, CalIcon,
} from "../lib/icons";

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
    list: "List", shop: "Dukaan", rates: "Rates",
    deliveries: "Deliveries", customers: "Customers",
    idle: "Bolo, main sun raha hoon",
    tap: "Mic dabao aur bolo",
    listening: "Boliye… mic on hai",
    thinking: "Samajh raha hoon…",
    speaking: "Bol raha hoon…",
    placeholder: "“2 kilo cheeni, 1 Maggi, Ramesh ke naam”",
    cash: "Cash", cashSub: "haath me paisa aaya",
    upi: "UPI", upiSub: "customer QR scan karega",
    khata: "Khata me likho", paid: "Abhi paid",
    ok: "Sahi hai", no: "Nahi", cancel: "Cancel",
    undo: "Undo last", refresh: "Refresh",
    themeD: "Dark mode", themeL: "Light mode",
    tryS: "Try saying", today: "Aaj",
    details: "Details",
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
    offline: "Offline — entries sync nahi hongi, reconnect ho jayega",
    staffMode: "Staff mode — billing + stock only",
    micFail: "Mic nahi khula — permission check karo",
    parseFail: "Samajh nahi aaya — phir se boliye",
    silence: "Kuch sunai nahi diya — phir boliye",
    micOn: "mic on", micOff: "mic off",
    correct: "Bolkar badlo",
    reparse: "Dobara samjho", editedTag: "edited",
    askTitle: "Ek sawaal",
    notFound: "list me nahi mila — kya karein?",
    which: "Kaun sa?",
    newCust: "naya customer hai — jodein?",
    addCust: "Jodo",
    newItem: "Naya item banayein",
    remove: "Hata do",
    pricePh: "daam ₹", itemPh: "item", qtyAsk: "Kitna?",
    create: "Banao",
    editItem: "Item edit karo", itemName: "naam", unitLbl: "unit",
    stockLbl: "stock", saveLbl: "Save", deleteLbl: "Delete",
    delSure: "Haan, delete karo", delNo: "Nahi",
    addItem: "+ Item jodein",
    changeCust: "Customer badlo",
    changeType: "Business type badlo",
    typeWarn: "Type badalne se tabs aur modules badal jaayenge. Pakka?",
    invite: "Assistant invite code",
    coach1: "Mic dabao aur bolo — bill khud banega",
    coach2: "Bill check karo, badlo, phir confirm",
    coach3: "Customer ko link milta hai — dono taraf same hisaab",
    coachGo: "Samajh gaya",
    scripted: "scripted test",
    saveBill: "Bill theek karo",
    choose: "chuno",
  },
  te: {
    counter: "కౌంటర్", ledger: "ఖాతా", stock: "స్టాక్",
    list: "జాబితా", shop: "దుకాణం", rates: "ధరలు",
    deliveries: "డెలివరీలు", customers: "కస్టమర్లు",
    idle: "చెప్పండి, వింటున్నాను",
    tap: "మైక్ నొక్కి చెప్పండి",
    listening: "చెప్పండి… మైక్ ఆన్",
    thinking: "అర్థం చేస్తున్నాను…",
    speaking: "చెబుతున్నాను…",
    placeholder: "“రెండు కిలో పంచదార, రమేష్ పేరు”",
    cash: "నగదు", cashSub: "డబ్బు చేతిలో వచ్చింది",
    upi: "UPI", upiSub: "కస్టమర్ QR స్కాన్ చేస్తారు",
    khata: "ఖాతాలో రాయి", paid: "ఇప్పుడే చెల్లింపు",
    ok: "సరే", no: "వద్దు", cancel: "వద్దు",
    undo: "రద్దు", refresh: "రిఫ్రెష్",
    themeD: "డార్క్ మోడ్", themeL: "లైట్ మోడ్",
    tryS: "ఇలా చెప్పండి", today: "ఈరోజు",
    details: "వివరాలు",
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
    offline: "ఆఫ్‌లైన్ — మళ్లీ కనెక్ట్ అవుతుంది",
    staffMode: "స్టాఫ్ మోడ్ — బిల్లింగ్ + స్టాక్ మాత్రమే",
    micFail: "మైక్ తెరవలేదు — permission చూడండి",
    parseFail: "అర్థం కాలేదు — మళ్లీ చెప్పండి",
    silence: "ఏమీ వినపడలేదు — మళ్లీ చెప్పండి",
    micOn: "మైక్ ఆన్", micOff: "మైక్ ఆఫ్",
    correct: "మాట్లాడి సరిచేయండి",
    reparse: "మళ్లీ అర్థం చేయి", editedTag: "సవరించింది",
    askTitle: "ఒక ప్రశ్న",
    notFound: "జాబితాలో లేదు — ఏం చేయాలి?",
    which: "ఏది?",
    newCust: "కొత్త కస్టమర్ — చేర్చాలా?",
    addCust: "చేర్చండి",
    newItem: "కొత్త వస్తువు చేయండి",
    remove: "తీసేయండి",
    pricePh: "ధర ₹", itemPh: "వస్తువు", qtyAsk: "ఎంత?",
    create: "చేయండి",
    editItem: "వస్తువు సవరణ", itemName: "పేరు", unitLbl: "యూనిట్",
    stockLbl: "స్టాక్", saveLbl: "సేవ్", deleteLbl: "తొలగించు",
    delSure: "అవును, తొలగించు", delNo: "వద్దు",
    addItem: "+ వస్తువు చేర్చండి",
    changeCust: "కస్టమర్ మార్చండి",
    changeType: "బిజినెస్ రకం మార్చండి",
    typeWarn: "రకం మార్తే ట్యాబ్స్ మారుతాయి. పక్కా?",
    invite: "అసిస్టెంట్ ఇన్‌వైట్ కోడ్",
    coach1: "మైక్ నొక్కి చెప్పండి — బిల్ తానే వస్తుంది",
    coach2: "బిల్ చూసి, సరిచేసి, నిర్ధారించండి",
    coach3: "కస్టమర్ కు లింక్ వస్తుంది — రెండు వైపులా ఒకే లెక్క",
    coachGo: "అర్థమైంది",
    scripted: "స్క్రిప్టెడ్ టెస్ట్",
    saveBill: "బిల్ సరిచేయండి",
    choose: "ఎంచుకోండి",
  },
  en: {
    counter: "Counter", ledger: "Khata", stock: "Stock",
    list: "List", shop: "Shop", rates: "Rates",
    deliveries: "Deliveries", customers: "Customers",
    idle: "Speak, I'm listening",
    tap: "Tap the mic and speak",
    listening: "Speak… mic is on",
    thinking: "Working it out…",
    speaking: "Speaking…",
    placeholder: "“2 kilo cheeni, 1 Maggi, for Ramesh”",
    cash: "Cash", cashSub: "paid in hand",
    upi: "UPI", upiSub: "customer scans the QR",
    khata: "Add to khata", paid: "Pay now",
    ok: "Looks right", no: "No", cancel: "Cancel",
    undo: "Undo last", refresh: "Refresh",
    themeD: "Dark mode", themeL: "Light mode",
    tryS: "Try saying", today: "Today",
    details: "Details",
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
    offline: "Offline — entries won't sync until reconnect",
    staffMode: "Staff mode — billing + stock only",
    micFail: "Mic didn't open — check permission",
    parseFail: "Didn't catch that — say it again",
    silence: "Heard nothing — speak again",
    micOn: "mic on", micOff: "mic off",
    correct: "Speak a correction",
    reparse: "Re-parse", editedTag: "edited",
    askTitle: "One question",
    notFound: "not in your list — what now?",
    which: "Which one?",
    newCust: "is a new customer — add them?",
    addCust: "Add",
    newItem: "Create new item",
    remove: "Remove",
    pricePh: "price ₹", itemPh: "item", qtyAsk: "How much?",
    create: "Create",
    editItem: "Edit item", itemName: "name", unitLbl: "unit",
    stockLbl: "stock", saveLbl: "Save", deleteLbl: "Delete",
    delSure: "Yes, delete it", delNo: "No",
    addItem: "+ Add item",
    changeCust: "Change customer",
    changeType: "Change business type",
    typeWarn: "Changing type changes tabs and modules. Sure?",
    invite: "Assistant invite code",
    coach1: "Tap the mic and speak — the bill writes itself",
    coach2: "Check the bill, fix it, then confirm",
    coach3: "The customer gets a link — same ledger both sides",
    coachGo: "Got it",
    scripted: "scripted test",
    saveBill: "Fix the bill",
    choose: "pick",
  },
};

const ICONS: Record<string, string> = {
  maggi: "🍜", chini: "🍬", daal: "🫘", chawal: "🍚", aata: "🌾",
  tel: "🫗", coke: "🥤", "parle-g": "🍪", doodh: "🥛", sabun: "🧼",
  shampoo: "🧴", anda: "🥚", pav: "🍞", "chai patti": "🍵",
  namkeen: "🥨", matchbox: "🔥", surf: "🧺", toothpaste: "🪥",
  kurkure: "🌽", ghee: "🧈", besan: "🫓", masala: "🌶️",
  dahi: "🥣", akhbar: "📰", "maggi sauce": "🥫",
  aloo: "🥔", pyaaz: "🧅", tamatar: "🍅", kela: "🍌",
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

const UNITS = ["piece", "kg", "g", "liter", "ml", "packet", "dozen"];

/* crude catalog fuzzy for ask-back suggestions (substring + prefix) */
function similar(name: string, catalog: any[], n = 3): any[] {
  const q = name.toLowerCase();
  const score = (p: any) => {
    const hay = [p.name_en, p.name_hi, p.name_te,
      ...(p.aliases || "").split(",")].filter(Boolean)
      .map((s: string) => s.toLowerCase());
    let best = 0;
    for (const h of hay) {
      if (h === q) return 100;
      if (h.includes(q) || q.includes(h)) best = Math.max(best, 60);
      else {
        const qa = q.split(/\s+/);
        const hit = qa.filter((w) => w.length > 2 && h.includes(w)).length;
        best = Math.max(best, hit * 25);
      }
    }
    return best;
  };
  return catalog.map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.p);
}

type Phase = "idle" | "listening" | "transcribing" | "parsing"
  | "awaiting" | "speaking";
const SAY_HOOK = process.env.NEXT_PUBLIC_SAY_HOOK === "1";

export default function Home() {
  const router = useRouter();
  const [tok, setTok] = useState("");
  const [lang, setLang] = useState("hinglish");
  const [listening, setListening] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [levels, setLevels] = useState<number[]>(Array(9).fill(0));
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState("");         // editable transcript
  const [edited, setEdited] = useState(false);
  const [scripted, setScripted] = useState(false);
  const [detected, setDetected] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [cust, setCust] = useState<{ id: number | null; name: string }>(
    { id: null, name: "" });
  const [result, setResult] = useState<{ text: string; link?: string;
    method?: string } | null>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [upiQr, setUpiQr] = useState<{ qr: string; link: string;
    amt: number } | null>(null);
  const [upiDone, setUpiDone] = useState<{ text: string;
    link?: string } | null>(null);
  const [paySheet, setPaySheet] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [custSheet, setCustSheet] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const [tab, setTab] = useState<
    "counter" | "ledger" | "stock" | "list" | "shop">("counter");
  const [lat, setLat] = useState<{ stt?: number; parse?: number; tts?: number }>({});
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState("owner");
  const [online, setOnline] = useState(true);
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [coach, setCoach] = useState(false);
  const session = useRef<VoiceSession | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const askedRef = useRef("");
  const t = T[lang] || T.hinglish;

  /* ------------------------------------------------ mic shutoff
     The critical fix: a final transcript (or any sheet / hidden tab /
     logout / error) means capture is dead — tracks stopped, ctx
     closed, socket closed. Recording indicator OFF. */
  function hardStopMic() {
    if (maxTimer.current) { clearTimeout(maxTimer.current);
      maxTimer.current = null; }
    session.current?.hardStop();
    session.current = null;
    setListening(false);
    setLevels(Array(9).fill(0));
  }

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) hardStopMic();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", hardStopMic);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", hardStopMic);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sheet open -> capture must already be dead; double-guarantee it
  const sheetOpen = !!(proposal || result || paySheet || editIdx !== null
    || custSheet || addSheet);
  useEffect(() => {
    if (sheetOpen) hardStopMic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen]);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(navigator.onLine);
    setDark(document.documentElement.dataset.theme === "dark");
    const l = localStorage.getItem("bk_lang");
    if (l && T[l]) setLang(l);
    return () => { window.removeEventListener("online", on);
      window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const tk = localStorage.getItem("bk_token");
    const r = localStorage.getItem("bk_role") || "owner";
    if (!tk) { router.replace("/login"); return; }
    setTok(tk); setToken(tk); setRole(r); refresh();
    api.shop().then(setShop).catch((e) => {
      if (String(e?.message).startsWith("401")) {
        localStorage.removeItem("bk_token"); router.replace("/login");
      } else if (String(e?.message).startsWith("409")) {
        router.replace("/onboarding");
      }
    });
    if (localStorage.getItem("bk_new_owner") ||
        !localStorage.getItem("bk_coach_v1")) {
      setCoach(true);
      localStorage.removeItem("bk_new_owner");
      localStorage.setItem("bk_coach_v1", "1");
    }
    // scripted-test hook, env-gated: ?say=<transcript> skips the mic only
    if (SAY_HOOK) {
      const say = new URLSearchParams(window.location.search).get("say");
      if (say) { setScripted(true); setTranscript(say); setDraft(say);
        runCommand(say); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    setDark(!dark);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("bk_theme", next); } catch {}
  }

  function refresh() {
    api.ledger().then(setLedger).catch(() => {});
    api.summary().then(setSummary).catch(() => {});
  }

  function loadCatalog() {
    if (!catalog) api.catalog().then(setCatalog).catch(() => {});
  }

  function buzz(p = 12) { try { navigator.vibrate?.(p); } catch {} }
  function showToast(s: string) { setToast(s);
    setTimeout(() => setToast(""), 2500); }

  async function startMic() {
    if (sheetOpen && !proposal) return;
    hardStopMic();
    setProposal(null); setResult(null); setTranscript(""); setDraft("");
    setEdited(false); setDetected(""); setLat({}); setUpiQr(null);
    askedRef.current = "";
    const s = new VoiceSession();
    session.current = s;
    s.onLevel = (rms) => {
      setLevels((old) => old.map((_, i) => {
        const gain = 1 + Math.abs(i - 4) / 4;
        return Math.min(30, 4 + rms * 220 * gain);
      }));
    };
    s.onState = (st) => {
      if (st === "error" || st === "closed") setListening(false);
    };
    s.onMessage = (m) => {
      if (m.type === "transcript" && m.is_final && m.text) {
        // === the fix: capture dies the instant speech ends ===
        hardStopMic();
        setTranscript(m.text); setDraft(m.text); setEdited(false);
        setDetected(m.detected_language_code || "");
        setLat((l) => ({ ...l, stt: m.latency }));
        runCommand(m.text);
      } else if (m.type === "transcript" && m.text) {
        setPhase("transcribing");
        setTranscript(m.text);
      } else if (m.type === "error") {
        hardStopMic();
        showToast("STT: " + (m.message || "error"));
      }
    };
    try {
      await s.start(WS_URL);
      setListening(true); setPhase("listening"); buzz(8);
      // hard cap: 20 s max, then flush what we have
      maxTimer.current = setTimeout(() => {
        if (session.current === s) { stopMic(); }
      }, 20000);
    } catch {
      showToast(t.micFail);
      hardStopMic(); setPhase("idle");
    }
  }

  async function stopMic() {
    // manual stop: ask the relay to commit, final transcript follows
    setPhase("parsing");
    await session.current?.stop();
    session.current = null;
    setListening(false);
    setLevels(Array(9).fill(0));
  }

  async function toggleMic() {
    if (listening) await stopMic();
    else await startMic();
  }

  async function runCommand(text: string) {
    const t0 = performance.now();
    setPhase("parsing");
    try {
      const p = await api.command(text, lang);
      setLat((l) => ({ ...l, parse: Math.round(performance.now() - t0) }));
      setProposal(p);
      setEditItems((p.items || []).map((i) => ({ ...i })));
      setCust({ id: p.customer_id ?? null,
                name: p.customer_name || "" });
      setPhase(p.needs_confirm ? "awaiting" : "idle");
      if (p.kind === "bill") loadCatalog();
      if (p.spoken && !p.needs_confirm) {
        const t1 = performance.now();
        setPhase("speaking");
        speak(p.spoken, lang).then(() =>
          setLat((l) => ({ ...l, tts: Math.round(performance.now() - t1) })))
          .finally(() => setPhase("idle"));
      }
    } catch {
      showToast(t.parseFail);
      setPhase("idle");
    }
  }

  /* ask-back: spoken question for unresolved/ambiguous, once */
  useEffect(() => {
    if (!proposal || proposal.kind !== "bill") return;
    const issues = [
      ...editItems.filter((i) => i.options?.length),
      ...(proposal.unresolved || []),
    ];
    if (!issues.length || askedRef.current === proposal.proposal_id) return;
    askedRef.current = proposal.proposal_id;
    const firstUnres = (proposal.unresolved || [])
      .find((u) => !u.startsWith("customer:"));
    const amb = editItems.find((i) => i.options?.length);
    const custUnres = (proposal.unresolved || [])
      .find((u) => u.startsWith("customer:"));
    let q = "";
    if (firstUnres) {
      q = lang === "te"
        ? `'${firstUnres}' జాబితాలో లేదు. కొత్తదిగా చేర్చాలా?`
        : `'${firstUnres}' list me nahi mila. Naya banayein?`;
    } else if (amb) {
      q = (lang === "te" ? `ఏది? ` : `Kaun sa? `) +
        (amb.options || []).join(lang === "te" ? " లేదా " : " ya ");
    } else if (custUnres) {
      const n = custUnres.split(":", 2)[1];
      q = lang === "te" ? `${n} కొత్త కస్టమర్. చేర్చాలా?`
        : `${n} naya customer hai. Jodein?`;
    }
    if (q) speak(q, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal?.proposal_id]);

  function dirty() {
    // did the owner edit anything vs the spoken proposal?
    if (!proposal) return false;
    if (cust.id !== (proposal.customer_id ?? null)) return true;
    const orig = proposal.items || [];
    if (editItems.length !== orig.length) return true;
    return editItems.some((i, x) => {
      const o = orig[x] || {};
      return i.product_id !== o.product_id || i.qty !== o.qty
        || i.unit !== o.unit
        || (i.unit_price_paise ?? null) !== (o.unit_price_paise ?? null)
        || (i.name || "") !== (o.name || "");
    });
  }

  async function doConfirm(accept: boolean, method = "") {
    if (!proposal) return;
    setBusy(true);
    try {
      let pid = proposal.proposal_id;
      if (accept && proposal.kind === "bill" && dirty()) {
        const p2 = await api.billEdit(editItems, {
          customer_id: cust.id, customer_name: cust.name, lang,
          transcript });
        pid = p2.proposal_id;
      }
      const r = await api.confirm(pid, accept, method);
      if (r.written) {
        const link = r.confirm_path
          ? `${window.location.origin}${r.confirm_path}` : undefined;
        if (method === "upi" && proposal.total_paise) {
          // keep the pay sheet alive to show the QR (proposal clears
          // below, so stash the amount inside upiQr)
          const u = await api.upi(proposal.total_paise);
          const qr = await QRCode.toDataURL(u.upi,
            { width: 240, margin: 1 });
          setUpiQr({ qr, link: u.upi, amt: proposal.total_paise });
          setUpiDone({ text: r.spoken || "Done", link });
        } else {
          setResult({ text: r.spoken || "Done", link, method });
          setUpiQr(null); setPaySheet(false);
        }
        setProposal(null); setEditItems([]);
        if (r.spoken) { setPhase("speaking");
          speak(r.spoken, lang).finally(() => setPhase("idle")); }
        buzz(25);
        refresh();
      } else {
        setProposal(null); setEditItems([]);
        showToast(accept ? (r.error || "Failed") : "Cancelled");
      }
    } finally { setBusy(false); }
  }

  async function doUndo() {
    const r = await api.undo();
    showToast(r.undone ? `Undone: ${r.undone.kind}` : "Kuch nahi tha");
    refresh();
  }

  function signOut() {
    hardStopMic();
    localStorage.removeItem("bk_token");
    setToken(""); setTok("");
    router.replace("/login");
  }

  /* ------------------------------------------------ ask-back actions */
  function resolveItem(idx: number, product: any) {
    const items = [...editItems];
    const it = { ...items[idx] };
    it.product_id = product.id;
    it.product_name = product.name_en;
    it.unit = it.unit || product.unit || "piece";
    it.options = [];
    // price comes from catalog unless owner overrode
    it.unit_price_paise = product.price_paise;
    it.line_total_paise = Math.round(it.qty * product.price_paise);
    items[idx] = it;
    setEditItems(items);
    clearUnresolved(it.name);
  }

  function clearUnresolved(name: string) {
    if (!proposal) return;
    setProposal({ ...proposal, unresolved: (proposal.unresolved || [])
      .filter((u) => u !== name) });
  }

  function removeItem(idx: number) {
    const name = editItems[idx]?.name;
    setEditItems(editItems.filter((_, i) => i !== idx));
    if (name) clearUnresolved(name);
    setEditIdx(null);
  }

  async function addNewCustomer(name: string) {
    if (!name.trim()) return;
    try {
      const r = await api.addCustomer(name.trim(), "", lang);
      setCust({ id: r.customer.id, name: r.customer.name });
      // NOTE: do NOT set proposal.customer_id here — dirty() compares
      // cust vs proposal; if they match, confirm reuses the stale
      // stash and the customer gets dropped from the write.
      if (proposal) setProposal({ ...proposal,
        unresolved: (proposal.unresolved || [])
          .filter((u) => u !== `customer:${name.trim()}`) });
      setCustSheet(false);
      setCatalog((c: any) => c && { ...c,
        customers: [...(c.customers || []), r.customer] });
    } catch { showToast("failed"); }
  }

  function liveTotal() {
    return editItems.reduce((s, i) => s + (i.line_total_paise || 0), 0);
  }

  /* ------------------------------------------------ app */
  const btype = shop?.business_type || "kirana";
  const modules = shop?.modules || {};
  const showStock = modules.stock !== false ||
    ["milk", "newspaper"].includes(btype);
  const showList = modules.delivery !== false || modules.reminders !== false;
  const TABS: [typeof tab, any, string][] = [
    ["counter", MicIcon, t.counter],
    ["ledger", BookIcon,
      btype === "milk" || btype === "newspaper" ? t.customers : t.ledger],
  ];
  if (showStock) TABS.push(["stock", BoxIcon,
    btype === "milk" || btype === "newspaper" ? t.rates : t.stock]);
  if (showList) TABS.push(["list", ListIcon,
    btype === "milk" || btype === "newspaper" ? t.deliveries : t.list]);
  TABS.push(["shop", StoreIcon, t.shop]);
  const avgLevel = levels.reduce((a, b) => a + b, 0) / levels.length;
  const today = summary?.total_sales_paise;

  return (
    <main>
      {!online && <div className="offline-bar">{t.offline}</div>}
      <header className="topbar">
        <div className="wordmark">Bolo Khata
          <span className="sub">{role === "staff" ? "staff" : ""}</span></div>
        <div className="row" style={{ gap: 8 }}>
          <span className={"mic-stat" + (listening ? " on" : "")}
            aria-live="polite">
            {listening ? t.micOn : t.micOff}</span>
          <div className="seg" role="tablist" aria-label="language">
            {LANGS.map((l) => (
              <button key={l.k} className={lang === l.k ? "sel" : ""}
                onClick={() => { setLang(l.k);
                  try { localStorage.setItem("bk_lang", l.k); } catch {} }}
                aria-label={"language " + l.k}>
                {l.label}</button>
            ))}
          </div>
          <div className="menu-wrap">
            <button className="icon-btn" onClick={() => setMenu((m) => !m)}
              aria-label="menu" aria-expanded={menu}>
              <DotsIcon /></button>
            {menu && (<>
              <div style={{ position: "fixed", inset: 0, zIndex: 79 }}
                onClick={() => setMenu(false)} />
              <div className="menu" role="menu">
                <button onClick={toggleTheme}>
                  {dark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
                  {dark ? t.themeL : t.themeD}</button>
                {role === "owner" && (
                  <button onClick={() => { setMenu(false); doUndo(); }}>
                    <UndoIcon size={20} />{t.undo}</button>)}
                <button onClick={() => { setMenu(false); refresh(); }}>
                  <RefreshIcon size={20} />{t.refresh}</button>
                <button onClick={signOut}>
                  <OutIcon size={20} />Sign out</button>
              </div>
            </>)}
          </div>
        </div>
      </header>

      {tab === "counter" && (<>
        {/* hand-painted signboard — the shop's own name */}
        {shop?.name && (
          <div className="signboard" aria-label={shop.name}>
            <span className="signboard-inner">{shop.name}</span>
          </div>)}
        {role === "staff" && (
          <div className="surface tonal" style={{ padding: "12px 16px",
            fontSize: 14, color: "var(--ink2)" }}>{t.staffMode}</div>)}
        {role === "staff" && <StaffLeaveBanner />}

        {/* ------- mic stage: the one focal point ------- */}
        <div className={"stage" + ((proposal || result) ? " compact" : "")}>
          <div className="transcript" aria-live="polite">
            {transcript ? (<>
              <input className="transcript-edit" value={draft}
                aria-label="transcript, editable"
                onChange={(e) => { setDraft(e.target.value);
                  setEdited(true); }} />
              {edited && <span className="edited-tag">{t.editedTag}</span>}
              {scripted && <span className="edited-tag">{t.scripted}</span>}
              <button className="link" style={{ fontSize: 14 }}
                onClick={() => { setTranscript(draft); runCommand(draft); }}>
                {t.reparse}</button>
            </>) : (
              <span className="ph"><b className="try-tag">Try:</b>{" "}
                {t.placeholder}</span>)}
          </div>
          <div className={"mic-orbit" + (listening ? " listening" : "")}>
            <span className="glow-ring" aria-hidden="true" />
            <span className="level-ring" aria-hidden="true"
              style={{ transform: `scale(${1 + avgLevel * 0.012})` }} />
            <button className={"big-mic" + (listening ? " on" : "")}
              onClick={toggleMic} disabled={sheetOpen && !listening}
              aria-label={listening ? "stop listening" : "start listening"}
              style={sheetOpen && !listening
                ? { opacity: 0.45, filter: "grayscale(0.6)" } : undefined}>
              {listening ? <StopIcon size={38} /> : <MicIcon size={40} />}
            </button>
          </div>
          {phase === "listening" && (
            <div className="wave" aria-hidden="true">
              {levels.map((h, i) => (
                <i key={i} className="bar"
                  style={{ height: Math.min(30, h) }} />
              ))}
            </div>)}
          <div className="mic-caption">
            {listening ? t.listening :
             phase === "parsing" ? t.thinking :
             phase === "speaking" ? t.speaking :
             phase === "transcribing" ? t.listening :
             transcript ? t.tap : t.idle}
          </div>
        </div>

        {!proposal && !result && (<>
          <div className="try-row">
            <b>{t.tryS}:</b>
            {(lang === "te"
              ? ["“రెండు కిలో పంచదార”", "“రమేష్ ఖాతా”", "“ఈ వారం లెక్క”"]
              : lang === "en"
              ? ["“2 kilo cheeni”", "“Ramesh ka khata”", "“weekly summary”"]
              : ["“2 kilo cheeni”", "“Ramesh ka khata”",
                 "“is hafte ka hisaab”"]
            ).map((s) => <div key={s}>{s}</div>)}
          </div>
          {today != null && (
            <div className="today-stat">{t.today}:{" "}
              <b>{inr(today)}</b></div>)}
          <details className="debug">
            <summary>{t.details}</summary>
            <div className="latency">
              {detected && <span>lang <b>{detected}</b></span>}
              <span>STT <b>{lat.stt ?? "—"}ms</b></span>
              <span>parse <b>{lat.parse ?? "—"}ms</b></span>
              <span>TTS <b>{lat.tts ?? "—"}ms</b></span>
            </div>
          </details>
        </>)}
      </>)}

      {tab === "ledger" && ledger && <LedgerPanel ledger={ledger}
        summary={summary} t={t} />}
      {tab === "stock" && ledger && <StockPanel role={role} t={t} />}
      {tab === "list" && <RemindersPanel t={t} />}
      {tab === "shop" && (<>
        <ShopPanel t={t} btype={btype}
          onTypeChange={() => api.shop().then(setShop)} />
        <LeavePanel />
        <StaffInviteCard t={t} /></>)}

      {/* ------- bill sheet (editable) ------- */}
      {proposal && (
        <>
          <div className="sheet-back"
            onClick={() => { if (!busy && !paySheet) doConfirm(false); }} />
          <div className="sheet" role="dialog" aria-label="bill">
            <div className="grab" aria-hidden="true" />
            <div className="cust-head">
              {cust.name
                ? <span className="avatar">
                    {cust.name.split(/\s+/).map((w) => w[0])
                      .slice(0, 2).join("").toUpperCase()}</span>
                : <span className="avatar"><UserIcon size={20} /></span>}
              <div className="who">
                <button className="link" style={{ fontWeight: 800,
                  fontSize: 17, padding: 0 }}
                  onClick={() => { setCustSheet(true); loadCatalog(); }}>
                  {cust.name || t.changeCust}</button>
                <span className="caption">
                  parse conf {(proposal.confidence * 100).toFixed(0)}%
                  {edited ? ` · ${t.editedTag}` : ""}
                  {proposal.noise_hint ? " · noise — card check karo" : ""}
                </span>
              </div>
              <button className="link" onClick={() => startMic()}
                style={{ fontSize: 14 }}>{t.correct}</button>
            </div>

            {/* editable transcript — reachable while the sheet is open */}
            <div className="sheet-transcript">
              <input className="transcript-edit" value={draft}
                aria-label="transcript, editable"
                placeholder={transcript}
                onChange={(e) => { setDraft(e.target.value);
                  setEdited(true); }} />
              <button className="link" style={{ fontSize: 14,
                flexShrink: 0 }}
                onClick={() => { setTranscript(draft);
                  runCommand(draft); }}>
                {t.reparse}</button>
            </div>

            {/* ask-back cards — questions before actions */}
            <AskBack proposal={proposal} editItems={editItems}
              setEditItems={setEditItems} catalog={catalog} t={t}
              lang={lang} cust={cust} setCust={setCust}
              addNewCustomer={addNewCustomer}
              onNewItem={(idx: number, base: any) => {
                // quick-create unresolved item as a catalog product
                setEditIdx(idx);
              }}
              onResolve={(idx: number, p: any) => resolveItem(idx, p)}
              onRemove={removeItem} />

            {proposal.kind === "bill" && editItems.length ? (
              <div className="bill-rows">
                {editItems.map((i, idx) => (
                  <button className={"bill-row tappable" +
                        (i.product_id ? "" : " warn")}
                    key={idx} style={{ animationDelay: `${idx * 40}ms` }}
                    onClick={() => { setEditIdx(idx); loadCatalog(); }}
                    aria-label={`edit ${i.product_name || i.name}`}>
                    <span className="em">
                      {icon(i.product_name || i.name)}</span>
                    <span className="nm">{i.product_name || i.name}</span>
                    <span className="qn">{unitPrice(i)}</span>
                    <span className="amt2">{inr(i.line_total_paise)}</span>
                  </button>))}
                <button className="link" style={{ alignSelf: "flex-start",
                  marginTop: 4 }}
                  onClick={() => { setAddSheet(true); loadCatalog(); }}>
                  {t.addItem}</button>
                <div className="bill-total">
                  <span className="lab">Total</span>
                  <span className="amt">{inr(
                    dirty() ? liveTotal() : proposal.total_paise)}</span>
                </div>
              </div>
            ) : (
              <div className="title" style={{ fontSize: 19,
                margin: "14px 0 4px" }}>{proposal.description}</div>
            )}
            {proposal.spoken && (
              <div className="readback"><SpeakerIcon size={15} />
                <span>“{proposal.spoken}”</span></div>)}
            {proposal.needs_confirm && !paySheet && (
              <div className="sheet-foot">
                {proposal.kind === "bill" ? (<>
                  <button className="primary big" style={{ width: "100%" }}
                    disabled={!cust.id || busy}
                    onClick={() => doConfirm(true, "khata")}>{t.khata}</button>
                  <button className="big" style={{ width: "100%",
                    background: "var(--s2)" }} disabled={busy}
                    onClick={() => setPaySheet(true)}>{t.paid}</button>
                </>) : (
                  <button className="primary big" style={{ width: "100%" }}
                    disabled={busy}
                    onClick={() => doConfirm(true)}>{t.ok}</button>)}
                <button className="link cancel-link" disabled={busy}
                  onClick={() => doConfirm(false)}>{t.cancel}</button>
              </div>)}
          </div>
        </>)}

      {/* ------- line edit sheet ------- */}
      {editIdx !== null && editItems[editIdx] && (
        <LineEditSheet idx={editIdx} item={editItems[editIdx]}
          catalog={catalog} role={role} t={t}
          onClose={() => setEditIdx(null)}
          onChange={(it: any) => {
            const arr = [...editItems]; arr[editIdx] = it;
            setEditItems(arr);
          }}
          onProductPicked={(p: any) => { resolveItem(editIdx, p);
            setEditIdx(null); }}
          onRemove={() => removeItem(editIdx)} />)}

      {/* ------- add item sheet ------- */}
      {addSheet && (
        <AddItemSheet catalog={catalog} t={t}
          onClose={() => setAddSheet(false)}
          onPick={(p: any) => {
            setEditItems([...editItems, {
              product_id: p.id, product_name: p.name_en, name: p.name_en,
              qty: 1, unit: p.unit || "piece",
              unit_price_paise: p.price_paise,
              line_total_paise: p.price_paise, score: 1 }]);
            setAddSheet(false);
          }} />)}

      {/* ------- customer sheet ------- */}
      {custSheet && (
        <CustomerSheet catalog={catalog} t={t} current={cust.id}
          onClose={() => setCustSheet(false)}
          onPick={(c: any) => { setCust({ id: c.id, name: c.name });
            setCustSheet(false); }}
          onNew={(n: string) => addNewCustomer(n)} />)}

      {/* ------- pay method sheet ------- */}
      {paySheet && (proposal || upiQr) && (
        <div className="sheet" role="dialog" aria-label="payment"
          style={{ zIndex: 62 }}>
          <div className="grab" aria-hidden="true" />
          <div className="centre-col" style={{ marginBottom: 14 }}>
            <div className="display">{inr(upiQr ? upiQr.amt :
              dirty() ? liveTotal() : proposal?.total_paise)}</div>
            <div className="caption">{cust.name || "customer"}</div>
          </div>
          {upiQr ? (
            <div className="centre-col" style={{ gap: 12 }}>
              <div className="qr-tile">
                <img src={upiQr.qr} alt="UPI QR" width={200} /></div>
              <div className="caption">{t.selfReport}</div>
              <button className="primary big" style={{ width: "100%" }}
                onClick={() => { setPaySheet(false); setUpiQr(null);
                  if (upiDone) { setResult({ ...upiDone, method: "upi" });
                    setUpiDone(null); } }}>
                {t.done}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column",
              gap: 10 }}>
              <button className="pay-row" disabled={busy}
                onClick={() => doConfirm(true, "cash")}>
                <CashIcon size={24} />
                <span>{t.cash}<span className="sub">{t.cashSub}</span></span>
              </button>
              <button className="pay-row" disabled={busy}
                onClick={() => doConfirm(true, "upi")}>
                <UpiIcon size={24} />
                <span>{t.upi}<span className="sub">{t.upiSub}</span></span>
              </button>
              <button className="link cancel-link"
                onClick={() => setPaySheet(false)}>{t.cancel}</button>
            </div>)}
        </div>)}

      {/* ------- result: calm done state + rubber stamp ------- */}
      {result && (
        <>
          <div className="sheet-back" onClick={() => setResult(null)} />
          <div className="sheet" role="status" aria-live="polite"
            style={{ textAlign: "center" }}>
            <div className="grab" aria-hidden="true" />
            <div className="centre-col" style={{ gap: 10, paddingTop: 4 }}>
              <div className="stamp" aria-hidden="true">
                {result.method === "cash" || result.method === "upi"
                  ? "PAID" : "LIKH DIYA"}</div>
              <svg width="56" height="56" viewBox="0 0 34 34"
                aria-hidden="true">
                <circle cx="17" cy="17" r="16" fill="var(--ok-soft)" />
                <path className="check-draw" d="M10 17.5l5 5 9-11" fill="none"
                  stroke="var(--ok)" strokeWidth="3.4" strokeLinecap="round"
                  strokeLinejoin="round" />
              </svg>
              <div className="title" style={{ fontSize: 20 }}>{result.text}</div>
              {result.link && (<>
                <div className="caption">{t.linkNote}</div>
                <a className="confirm-link" href={result.link} target="_blank"
                  rel="noreferrer">{result.link}</a>
                <a className="confirm-link"
                  href={`https://wa.me/?text=${encodeURIComponent(
                    "Aapka udhaar confirm karein: " + result.link)}`}
                  target="_blank" rel="noreferrer">{t.shareWa}</a>
              </>)}
              <button className="primary big" style={{ width: "100%",
                marginTop: 8 }} onClick={() => setResult(null)}>
                {t.done}</button>
            </div>
          </div>
        </>)}

      {/* ------- first-run coach marks ------- */}
      {coach && (
        <>
          <div className="sheet-back" style={{ zIndex: 90 }} />
          <div className="sheet coach" role="dialog"
            aria-label="quick tips" style={{ zIndex: 91 }}>
            <div className="grab" aria-hidden="true" />
            <div className="centre-col" style={{ gap: 14 }}>
              {[t.coach1, t.coach2, t.coach3].map((c, i) => (
                <div key={i} className="coach-row">
                  <span className="step-num">{i + 1}</span>{c}</div>))}
              <button className="primary big" style={{ width: "100%" }}
                onClick={() => setCoach(false)}>{t.coachGo}</button>
            </div>
          </div>
        </>)}

      <nav className="tabbar" aria-label="main">
        <div className="tabs">
          {TABS.filter(([k]) => role === "owner" || k !== "shop")
            .map(([k, Ic, lb]) => (
            <button key={k} className={tab === k ? "sel" : ""}
              onClick={() => setTab(k as any)} aria-label={lb}>
              <Ic size={21} />{lb}
              <span className="dot" aria-hidden="true" /></button>))}
        </div>
      </nav>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

/* ==================== ask-back ==================== */

function AskBack({ proposal, editItems, setEditItems, catalog, t, lang,
                  cust, setCust, addNewCustomer, onResolve, onRemove,
                  onNewItem }: any) {
  const [newItemFor, setNewItemFor] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("piece");
  const [custQty, setCustQty] = useState<Record<number, string>>({});
  const unres = (proposal.unresolved || [])
    .filter((u: string) => !u.startsWith("customer:"));
  const custUnres = (proposal.unresolved || [])
    .find((u: string) => u.startsWith("customer:"));
  const cards: any[] = [];

  editItems.forEach((i: any, idx: number) => {
    if (i.options?.length) {
      cards.push(
        <div className="ask-card" key={`amb-${idx}`}>
          <b>{t.which} {i.name}</b>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {i.options.map((o: string) => {
              const p = (catalog?.products || [])
                .find((x: any) => x.name_en === o);
              return p ? (
                <button key={o} className="tonal"
                  onClick={() => onResolve(idx, p)}>{icon(o)} {o}</button>
              ) : null;
            })}
            <button className="tonal"
              onClick={() => setNewItemFor(idx)}>+ {t.newItem}</button>
            <button className="link" onClick={() => onRemove(idx)}>
              {t.remove}</button>
          </div>
          {newItemFor === idx && (
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <span className="nm" style={{ flex: "0 0 auto" }}>{i.name}</span>
              <input inputMode="decimal" style={{ width: 74 }}
                placeholder={t.pricePh} value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-label="new item price" />
              <select value={unit} aria-label="new item unit"
                onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button className="primary" disabled={!price}
                onClick={async () => {
                  try {
                    const r = await api.addProduct({
                      name_en: i.name, unit,
                      price_paise:
                        Math.round(parseFloat(price) * 100) });
                    onResolve(idx, r.product);
                    setNewItemFor(null);
                  } catch {}
                }}>{t.create}</button>
            </div>)}
        </div>);
    } else if (!i.product_id && unres.includes(i.name)) {
      const sugg = catalog ? similar(i.name, catalog.products) : [];
      cards.push(
        <div className="ask-card" key={`unres-${idx}`}>
          <b>“{i.name}” {t.notFound}</b>
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {sugg.map((p: any) => (
              <button key={p.id} className="tonal"
                onClick={() => onResolve(idx, p)}>
                {icon(p.name_en)} {p.name_en}</button>))}
            <button className="tonal"
              onClick={() => setNewItemFor(idx)}>+ {t.newItem}</button>
            <button className="link" onClick={() => onRemove(idx)}>
              {t.remove}</button>
          </div>
          {newItemFor === idx && (
            <div className="row" style={{ marginTop: 8, gap: 8 }}>
              <span className="nm" style={{ flex: "0 0 auto" }}>{i.name}</span>
              <input inputMode="decimal" style={{ width: 74 }}
                placeholder={t.pricePh} value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-label="new item price" />
              <select value={unit} aria-label="new item unit"
                onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button className="primary" disabled={!price}
                onClick={async () => {
                  try {
                    const r = await api.addProduct({
                      name_en: i.name, unit,
                      price_paise:
                        Math.round(parseFloat(price) * 100) });
                    onResolve(idx, r.product);
                    setNewItemFor(null);
                  } catch {}
                }}>{t.create}</button>
            </div>)}
          {!i.qty && (
            <div className="row" style={{ marginTop: 6, gap: 8 }}>
              <span>{t.qtyAsk}</span>
              <input inputMode="decimal" style={{ width: 74 }}
                value={custQty[idx] || ""} aria-label="quantity"
                onChange={(e) => setCustQty(
                  { ...custQty, [idx]: e.target.value })}
                onBlur={() => {
                  const qv = parseFloat(custQty[idx] || "0");
                  if (qv > 0) {
                    const arr = [...editItems];
                    arr[idx] = { ...arr[idx], qty: qv,
                      line_total_paise: Math.round(
                        qv * (arr[idx].unit_price_paise || 0)) };
                    setEditItems(arr);
                  } }} />
            </div>)}
        </div>);
    }
  });

  if (custUnres) {
    const nm = custUnres.split(":", 2)[1];
    cards.push(
      <div className="ask-card" key="cust">
        <b>{nm} — {t.newCust}</b>
        <div className="row" style={{ gap: 8 }}>
          <button className="primary"
            onClick={() => addNewCustomer(nm)}>{t.addCust}</button>
        </div>
      </div>);
  }
  if (!cards.length) return null;
  return <div className="ask-wrap">{cards}</div>;
}

/* ==================== sub-sheets ==================== */

function LineEditSheet({ idx, item, catalog, role, t, onClose, onChange,
                         onProductPicked, onRemove }: any) {
  const [q, setQ] = useState("");
  const prods = (catalog?.products || []).filter((p: any) =>
    !q || (p.name_en + " " + (p.aliases || "")).toLowerCase()
      .includes(q.toLowerCase()));
  const setQty = (d: number) => {
    const qty = Math.max(0.25, +(item.qty + d).toFixed(2));
    onChange({ ...item, qty,
      line_total_paise: Math.round(qty * (item.unit_price_paise || 0)) });
  };
  const setQtyExact = (raw: string) => {
    const qty = parseFloat(raw);
    if (isNaN(qty) || qty <= 0) return;
    onChange({ ...item, qty,
      line_total_paise: Math.round(qty * (item.unit_price_paise || 0)) });
  };
  return (<>
    <div className="sheet-back" style={{ zIndex: 64 }}
      onClick={onClose} />
    <div className="sheet" role="dialog" aria-label="edit item"
      style={{ zIndex: 65 }}>
      <div className="grab" aria-hidden="true" />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b style={{ fontSize: 17 }}>{item.product_name || item.name}</b>
        <button className="link" onClick={onRemove}
          aria-label={t.remove}><XIcon size={18} /></button>
      </div>
      <div className="row" style={{ marginTop: 8, gap: 10,
        alignItems: "center" }}>
        <button className="stepper" aria-label="less"
          onClick={() => setQty(-1)}>−</button>
        <input className="qty-input" inputMode="decimal"
          defaultValue={item.qty} aria-label="quantity"
          onBlur={(e) => setQtyExact(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter")
            (e.target as HTMLInputElement).blur(); }} />
        <button className="stepper" aria-label="more"
          onClick={() => setQty(1)}>+</button>
        <select value={item.unit} aria-label="unit"
          onChange={(e) => onChange({ ...item, unit: e.target.value })}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      {role === "owner" && item.product_id && (
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <span className="dim">{t.pricePh}</span>
          <input inputMode="decimal" style={{ width: 90 }}
            defaultValue={((item.unit_price_paise || 0) / 100).toString()}
            aria-label="price override"
            onBlur={(e) => {
              const v = Math.round(parseFloat(e.target.value || "0") * 100);
              if (!isNaN(v)) onChange({ ...item, unit_price_paise: v,
                line_total_paise: Math.round(item.qty * v) });
            }} />
        </div>)}
      <div className="caption" style={{ margin: "10px 0 4px" }}>
        {t.choose} {t.itemPh}:</div>
      <div className="row">
        <SearchIcon size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPh} style={{ flex: 1 }}
          aria-label="search product" />
      </div>
      <div className="pick-list">
        {prods.slice(0, 8).map((p: any) => (
          <button key={p.id} className="pick-row"
            onClick={() => onProductPicked(p)}>
            <span>{icon(p.name_en)} {p.name_en}</span>
            <span className="dim">{inr(p.price_paise)}/{p.unit}</span>
          </button>))}
      </div>
    </div>
  </>);
}

function AddItemSheet({ catalog, t, onClose, onPick }: any) {
  const [q, setQ] = useState("");
  const prods = (catalog?.products || []).filter((p: any) =>
    !q || (p.name_en + " " + (p.aliases || "")).toLowerCase()
      .includes(q.toLowerCase()));
  return (<>
    <div className="sheet-back" style={{ zIndex: 64 }} onClick={onClose} />
    <div className="sheet" role="dialog" aria-label="add item"
      style={{ zIndex: 65 }}>
      <div className="grab" aria-hidden="true" />
      <div className="row">
        <SearchIcon size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPh} style={{ flex: 1 }} autoFocus
          aria-label="search product" />
      </div>
      <div className="pick-list">
        {prods.map((p: any) => (
          <button key={p.id} className="pick-row" onClick={() => onPick(p)}>
            <span>{icon(p.name_en)} {p.name_en}
              <span className="dim"> · {p.unit}</span></span>
            <b>{inr(p.price_paise)}</b>
          </button>))}
      </div>
    </div>
  </>);
}

function CustomerSheet({ catalog, t, current, onClose, onPick, onNew }: any) {
  const [q, setQ] = useState("");
  const custs = (catalog?.customers || []).filter((c: any) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()));
  return (<>
    <div className="sheet-back" style={{ zIndex: 64 }} onClick={onClose} />
    <div className="sheet" role="dialog" aria-label="customer"
      style={{ zIndex: 65 }}>
      <div className="grab" aria-hidden="true" />
      <b style={{ fontSize: 17 }}>{t.changeCust}</b>
      <div className="row" style={{ marginTop: 8 }}>
        <SearchIcon size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPh} style={{ flex: 1 }} autoFocus
          aria-label="search customer" />
      </div>
      <div className="pick-list">
        {q.trim() && !custs.some((c: any) =>
          c.name.toLowerCase() === q.trim().toLowerCase()) && (
          <button className="pick-row" onClick={() => onNew(q)}>
            <span>+ {q.trim()} ({t.addCust})</span></button>)}
        {custs.map((c: any) => (
          <button key={c.id} className="pick-row"
            onClick={() => onPick(c)}>
            <span>{c.name}</span>
            {c.id === current && <CheckIcon size={18} />}
          </button>))}
      </div>
    </div>
  </>);
}

function StaffInviteCard({ t }: any) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <div className="surface" style={{ padding: "4px 16px", marginTop: 16 }}>
      <div className="section-head" style={{ padding: 0 }}>{t.invite}</div>
      {code ? (
        <div className="entry">
          <b className="display" style={{ fontSize: 28 }}>{code}</b>
          <span className="caption">{name} — login page pe use karega</span>
        </div>) : (
        <div className="row" style={{ padding: "8px 0" }}>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="assistant ka naam" style={{ flex: 1 }}
            aria-label="assistant name" />
          <button className="primary" disabled={!name.trim()}
            onClick={async () => {
              const r = await api.staffInvite(name.trim());
              setCode(r.invite_code);
            }}>+</button>
        </div>)}
    </div>
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
    <>
      {summary && (
        <div className="surface" style={{ background:
          "linear-gradient(140deg, var(--primary-soft), var(--s1) 65%)",
          boxShadow: "var(--e1)" }}>
          <div className="caption">{t.summary}</div>
          <div className="display">{inr(summary.total_sales_paise)}</div>
          <div className="caption" style={{ marginTop: 4 }}>
            {(Object.entries(summary.by_kind || {}) as
              [string, { count: number; amount_paise: number }][])
              .map(([k, v]) => `${v.count} ${k.replace(/_/g, " ")} · ${inr(v.amount_paise)}`)
              .join("  ·  ")}</div>
        </div>)}
      <div className="row" style={{ marginTop: 16 }}>
        <SearchIcon size={18} />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder={t.searchPh} aria-label="search customer"
          style={{ flex: 1 }} />
      </div>
      <div className="section-head">{t.pendingH}</div>
      <div className="surface khata-book" style={{ padding: "4px 16px" }}>
        <div className="list">
        {ledger.pending?.filter((p: any) => filt(p.customer_name))
          .map((p: any) => (
          <div className="entry" key={p.id}>
            <span className="row">
              <span className="avatar">{initials(p.customer_name)}</span>
              {p.customer_name}
            </span>
            <span className="row" style={{ gap: 9 }}>
              <b className="bal due">{inr(p.amount_paise)}</b>
              <span className={"dot-st " + p.confirm_state}
                title={p.confirm_state} /></span>
          </div>))}
        {!ledger.pending?.length &&
          <div className="empty-state"><span className="em">✓</span>
            {t.none}</div>}
        </div>
      </div>
      <div className="section-head">{t.balancesH}</div>
      <div className="surface khata-book" style={{ padding: "4px 16px" }}>
        <div className="list">
        {ledger.balances?.filter((b: any) => filt(b.name)).map((b: any) => (
          <div className="entry" key={b.customer_id}>
            <span className="row">
              <span className="avatar">{initials(b.name)}</span>
              <span>{b.name}
                {b.trust && <span className="caption">
                  {"  ·  trust "}{b.trust.score}</span>}
              </span>
            </span>
            <b className={"bal " + (b.balance_paise > 0 ? "owe" : "paid")}>
              {inr(b.balance_paise)}</b>
          </div>))}
        </div>
      </div>
      <div className="section-head">{t.recentH}</div>
      <div className="surface" style={{ padding: "4px 16px" }}>
        <div className="list">
        {ledger.recent?.slice(0, 12).map((x: any) => (
          <div className="entry" key={x.id}>
            <span>{x.kind}{x.customer_name ? ` · ${x.customer_name}` : ""}</span>
            <span className="row" style={{ gap: 8 }}>{inr(x.amount_paise)}
              {x.confirm_state !== "none" && x.confirm_state !== "na" &&
                <span className={"dot-st " + x.confirm_state}
                  title={x.confirm_state} />}</span>
          </div>))}
        </div>
      </div>
    </>
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
    <div className="surface" style={{ background: "var(--warn-soft)",
      boxShadow: "none" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Owner ne chutti mark ki — sahi hai?</div>
      {items.map((l) => (
        <div className="entry" key={l.id}>
          <span>{l.day} · by {l.marked_by}</span>
          <span style={{ display: "flex", gap: 8 }}>
            <button className="ok" style={{ minHeight: 48, minWidth: 52 }}
              aria-label="accept leave"
              onClick={async () => {
                await api.staffLeaveRespond(l.id, "accept"); load(); }}>
              <CheckIcon size={19} /></button>
            <button className="danger" style={{ minHeight: 48, minWidth: 52 }}
              aria-label="dispute leave"
              onClick={async () => {
                await api.staffLeaveRespond(l.id, "dispute"); load(); }}>
              <XIcon size={19} /></button>
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
    <div className="surface" style={{ padding: "4px 16px",
      marginTop: 16 }}>
      <div className="section-head" style={{ padding: "0 0" }}>
        Staff leave — dual approval</div>
      <div className="list">
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
    <button aria-label="mark done" className="tickbox"
      onClick={async () => { await api.reminderDone(id); load(); }}>
      <CheckIcon size={19} /></button>);
  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>{t.restockH}</div>
      <div className="caption" style={{ marginBottom: 4 }}>{t.restockSub}</div>
      <div className="surface" style={{ padding: "4px 16px" }}>
        <div className="list">
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
        </div>
      </div>
      <div className="section-head">{t.remH}</div>
      <div className="surface" style={{ padding: "4px 16px" }}>
        <div className="list">
        {others.map((r) => (
          <div className="entry" key={r.id}>
            <span>{r.customer_name ? `${r.customer_name} ko yaad dilao`
              : JSON.parse(r.payload || "{}").text}</span>
            <Tick id={r.id} />
          </div>))}
        {!others.length && <div className="empty-state">none</div>}
        </div>
      </div>
      <DeliveriesPanel t={t} />
    </>
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
      <div className="section-head">{t.delH}</div>
      {subs.map((s) => (
        <div key={s.id} className="surface" style={{ padding: "16px 18px",
          marginBottom: 12 }}>
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
            <span className="row" style={{ gap: 5 }}>
              <i className="dot-st confirmed" /> delivered</span>
            <span className="row" style={{ gap: 5 }}>
              <i className="dot-st disputed" /> skipped</span>
            <span>aage: bolo “doodh nahi chahiye”</span>
          </div>
        </div>))}
      <div className="caption" style={{ padding: "0 4px" }}>
        skip karne ke liye bolo “Ramesh ka doodh kal se 2 din nahi chahiye”
        · bill ke liye “dudh ka bill”</div>
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
      <div className="section-head">{t.weekH}</div>
      <div className="surface" style={{ padding: "4px 16px" }}>
        <div className="list">
          {(w.top_sellers || []).map((s: any) => (
            <div className="entry" key={s.name}>
              <span>🏆 {s.name}</span>
              <b>{inr(s.rev)}</b>
            </div>))}
          {(w.running_out || []).map((s: any) => (
            <div className="entry" key={s.name}>
              <span>⚠ {s.name} — {s.days_left} din ka stock</span>
            </div>))}
          {(w.top_debtors || []).map((s: any) => (
            <div className="entry" key={s.name}>
              <span>{s.name}</span>
              <b className="bal owe">{inr(s.balance_paise)}</b>
            </div>))}
        </div>
      </div>
    </>
  );
}

/* coarse catalog grouping — keyword match on name + aliases, so
   "Basmati Chawal"-style variants land under the same chip as "Chawal" */
const GROUP_RULES: [string, string[]][] = [
  ["Rice, Atta & Flour",
    ["chawal", "chaval", "rice", "basmati", "atta", "aata", "gehu",
     "flour", "besan", "suji", "poha"]],
  ["Daal & Masala",
    ["daal", "dal", "arhar", "masala", "haldi", "mirchi", "dhania",
     "jeera", "spice"]],
  ["Sugar & Salt",
    ["chini", "cheeni", "sugar", "namak", "salt", "sendha"]],
  ["Oil & Ghee",
    ["tel", "oil", "ghee", "neyyi", "vanaspati", "dalda", "refined"]],
  ["Dairy",
    ["doodh", "milk", "dahi", "curd", "paneer", "butter", "amul"]],
  ["Snacks & Instant",
    ["maggi", "noodle", "namkeen", "bhujia", "kurkure", "chips", "lays",
     "parle", "biscuit", "bisket", "snack", "pizza"]],
  ["Tea & Drinks",
    ["chai", "tea", "coffee", "nescafe", "frooti", "drink", "juice",
     "squash"]],
  ["Personal Care",
    ["sabun", "soap", "shampoo", "toothpaste", "paste", "cream",
     "dettol", "lifebuoy"]],
];

function groupOf(p: any): string {
  const hay = `${p.name_en || ""} ${p.aliases || ""}`.toLowerCase();
  for (const [g, kws] of GROUP_RULES)
    if (kws.some((k) => hay.includes(k))) return g;
  return "Others";
}

function StockPanel({ role, t }: any) {
  const [cat, setCat] = useState<any>(null);
  const [reo, setReo] = useState<any[]>([]);
  const [grp, setGrp] = useState("");          // "" = show all
  const [edit, setEdit] = useState<any>(null); // product open in editor
  const load = () => {
    api.catalog().then(setCat).catch(() => {});
    api.reorder().then((r) => setReo(r.suggestions)).catch(() => {});
  };
  useEffect(load, []);
  if (!cat) return <div className="empty-state">…</div>;
  const low = (p: any) => p.stock <= (p.reorder_point || 0);
  const counts = new Map<string, number>();
  for (const p of cat.products) {
    const g = groupOf(p);
    counts.set(g, (counts.get(g) || 0) + 1);
  }
  const chips = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const shown = grp ? cat.products.filter((p: any) => groupOf(p) === grp)
                    : cat.products;

  function StockRow({ p, onTap }: any) {
    return (
      <div className="entry" role={onTap ? "button" : undefined}
        style={onTap ? { cursor: "pointer" } : undefined}
        onClick={onTap}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="row">
            <span>{icon(p.name_en)} {p.name_en}</span>
            {low(p) && <span className="pill disputed">low</span>}
          </span>
          <span className="dim" style={{ fontSize: 13 }}>
            {inr(p.price_paise)}/{p.unit}</span>
          <span className="stockbar" aria-hidden="true">
            <i style={{ width:
              `${Math.min(100, (p.stock / Math.max(1,
                (p.reorder_point || 10) * 3)) * 100)}%`,
              background: low(p) ? "var(--bad)" : "var(--ok)" }} />
          </span>
        </span>
        <b>{p.stock} {p.unit}</b>
      </div>);
  }

  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>Stock</div>
      <div className="chip-row" role="tablist" aria-label="categories">
        <button className={"chip" + (!grp ? " sel" : "")}
          onClick={() => setGrp("")}>Sab</button>
        {chips.map(([g, n]) => (
          <button key={g} className={"chip" + (grp === g ? " sel" : "")}
            onClick={() => setGrp(g)}>{g} · {n}</button>))}
      </div>
      <div className="surface" style={{ padding: "4px 16px" }}>
        <div className="list">
          {shown.map((p: any) => (
            <StockRow key={p.id} p={p}
              onTap={role === "owner" ? () => setEdit(p) : undefined} />))}
        </div>
      </div>
      {!!reo.length && (<>
        <div className="section-head">Reorder — AI nahi, sales history se</div>
        <div className="surface" style={{ padding: "4px 16px" }}>
          <div className="list">
            {reo.map((r: any) => (
              <div className="entry" key={r.product_id}>
                <span>{icon(r.name)} {r.name}
                  <span className="dim"> · {r.per_day}/din bikta hai</span></span>
                <b>{r.suggest_qty} {r.unit}</b>
              </div>))}
          </div>
        </div>
      </>)}

      {/* category window — every variant in the group, with prices */}
      {grp && (
        <>
          <div className="sheet-back" style={{ zIndex: 60 }}
            onClick={() => setGrp("")} />
          <div className="sheet" role="dialog"
            aria-label={`${grp} items`} style={{ zIndex: 61,
            maxHeight: "70vh", overflowY: "auto" }}>
            <div className="grab" aria-hidden="true" />
            <b style={{ fontSize: 18 }}>{grp}</b>
            <div className="caption" style={{ marginBottom: 8 }}>
              {shown.length} {t.itemPh}s — {t.pricePh} · {t.stockLbl}</div>
            <div className="list" style={{ fontSize: 15 }}>
              {shown.map((p: any) => (
                <div className="entry" key={p.id}
                  role={role === "owner" ? "button" : undefined}
                  style={role === "owner" ? { cursor: "pointer" } : undefined}
                  onClick={role === "owner" ? () => setEdit(p) : undefined}>
                  <span>{icon(p.name_en)} {p.name_en}</span>
                  <span className="row" style={{ gap: 10 }}>
                    <b>{inr(p.price_paise)}</b>
                    <span className={"bal " + (low(p) ? "due" : "paid")}>
                      {p.stock} {p.unit}</span>
                  </span>
                </div>))}
            </div>
          </div>
        </>)}

      {edit && (
        <ProductEditSheet p={edit} t={t} onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); load(); }} />)}
    </>
  );
}

function ProductEditSheet({ p, t, onClose, onSaved }: any) {
  const [name, setName] = useState(p.name_en || "");
  const [unit, setUnit] = useState(p.unit || "piece");
  const [price, setPrice] = useState(((p.price_paise || 0) / 100).toString());
  const [stock, setStock] = useState((p.stock ?? 0).toString());
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api.editProduct(p.id, {
        name_en: name.trim() || p.name_en, unit,
        price_paise: Math.round(parseFloat(price || "0") * 100),
        stock: parseFloat(stock || "0") });
      onSaved();
    } finally { setBusy(false); }
  }

  async function del() {
    setBusy(true);
    try { await api.deleteProduct(p.id); onSaved(); }
    catch { setBusy(false); setConfirmDel(false); }
  }

  return (<>
    <div className="sheet-back" style={{ zIndex: 64 }} onClick={onClose} />
    <div className="sheet" role="dialog" aria-label="edit product"
      style={{ zIndex: 65 }}>
      <div className="grab" aria-hidden="true" />
      <b style={{ fontSize: 17 }}>{t.editItem}</b>
      <div className="list" style={{ marginTop: 10, fontSize: 15 }}>
        <label className="dim" style={{ fontSize: 13 }}>{t.itemName}</label>
        <input value={name} onChange={(e) => setName(e.target.value)}
          aria-label="item name" />
        <label className="dim" style={{ fontSize: 13 }}>{t.unitLbl}</label>
        <select value={unit} onChange={(e) => setUnit(e.target.value)}
          aria-label="unit">
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <div className="row" style={{ gap: 10 }}>
          <label className="dim" style={{ fontSize: 13, flex: 1 }}>
            {t.pricePh}</label>
          <label className="dim" style={{ fontSize: 13, flex: 1 }}>
            {t.stockLbl}</label>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <input inputMode="decimal" value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-label="price rupees" style={{ flex: 1 }} />
          <input inputMode="decimal" value={stock}
            onChange={(e) => setStock(e.target.value)}
            aria-label="stock" style={{ flex: 1 }} />
        </div>
      </div>
      <div className="sheet-foot" style={{ marginTop: 12 }}>
        {confirmDel ? (
          <div className="row" style={{ gap: 8, width: "100%" }}>
            <button className="danger big" style={{ flex: 1 }}
              disabled={busy} onClick={del}>{t.delSure}</button>
            <button className="link" onClick={() => setConfirmDel(false)}>
              {t.delNo}</button>
          </div>) : (
          <div className="row" style={{ gap: 8, width: "100%" }}>
            <button className="danger" style={{ flex: 1 }}
              onClick={() => setConfirmDel(true)}>{t.deleteLbl}</button>
            <button className="primary big" style={{ flex: 2 }}
              disabled={busy || !name.trim()} onClick={save}>{t.saveLbl}</button>
          </div>)}
      </div>
    </div>
  </>);
}

function ShopPanel({ t, btype, onTypeChange }: any) {
  const [shop, setShop] = useState<any>(null);
  const [qr, setQr] = useState("");
  const [confirmType, setConfirmType] = useState(false);
  const [newType, setNewType] = useState(btype);
  useEffect(() => {
    api.shop().then(async (s) => {
      setShop(s);
      setNewType(s.business_type);
      const link = `${window.location.origin}/join/${s.join_code}`;
      setQr(await QRCode.toDataURL(link, { width: 200, margin: 1 }));
    }).catch(() => {});
  }, []);
  if (!shop) return null;
  const TYPES = ["kirana", "milk", "newspaper", "fruit_veg", "other"];
  return (
    <>
      <div className="section-head" style={{ marginTop: 8 }}>{t.joinQr}</div>
      <div className="surface centre-col" style={{ gap: 10 }}>
        {qr && <div className="qr-tile"><img src={qr} alt="join QR"
          width={180} /></div>}
        <b>{shop.name}</b>
        <div className="caption">code: {shop.join_code}</div>
        <div className="caption">{shop.business_type}</div>
      </div>
      <div className="section-head">{t.changeType}</div>
      <div className="surface" style={{ padding: "14px 16px" }}>
        {!confirmType ? (
          <div className="row" style={{ gap: 8 }}>
            <select value={newType} aria-label="business type"
              onChange={(e) => setNewType(e.target.value)}
              style={{ flex: 1 }}>
              {TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <button className="tonal" disabled={newType === btype}
              onClick={() => setConfirmType(true)}>
              {t.changeType}</button>
          </div>) : (
          <div className="centre-col" style={{ gap: 10 }}>
            <div className="caption">{t.typeWarn}</div>
            <div className="row" style={{ gap: 10 }}>
              <button className="primary" onClick={async () => {
                await api.setShopConfig(newType, {}, {});
                setConfirmType(false);
                const s = await api.shop(); setShop(s);
                onTypeChange?.(s);
              }}>{t.ok}</button>
              <button className="link"
                onClick={() => setConfirmType(false)}>{t.cancel}</button>
            </div>
          </div>)}
      </div>
    </>
  );
}
