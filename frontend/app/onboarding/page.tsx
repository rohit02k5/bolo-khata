"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { api, inr, setToken } from "../lib/api";
import { pick, useLang } from "../lib/i18n";
import { CheckIcon, StoreIcon, BoxIcon, ListIcon, UpiIcon,
         UserIcon, XIcon } from "../lib/icons";

const TYPES = [
  { k: "kirana", icon: StoreIcon, emoji: "🏪",
    hi: "Kirana / General store", te: "కిరానా / జనరల్ స్టోర్", en: "Kirana / General store" },
  { k: "milk", icon: BoxIcon, emoji: "🥛",
    hi: "Doodh delivery", te: "పాల డెలివరీ", en: "Milk delivery" },
  { k: "newspaper", icon: ListIcon, emoji: "📰",
    hi: "Akhbar delivery", te: "పేపర్ డెలివరీ", en: "Newspaper delivery" },
  { k: "fruit_veg", icon: BoxIcon, emoji: "🥬",
    hi: "Sabzi-phal thela", te: "కూరగాయల-పండ్లు", en: "Fruit & vegetable" },
  { k: "other", icon: StoreIcon, emoji: "🧾",
    hi: "Kuch aur", te: "మరేదైనా", en: "Something else" },
];

const S = {
  s1: { hi: "Dukaan ki jaankari", te: "దుకాణం వివరాలు", en: "About your shop" },
  s2: { hi: "Dukaan kis tarah ki hai?", te: "దుకాణం ఏ రకం?", en: "What kind of shop?" },
  s3: { hi: "UPI ID (optional)", te: "UPI ID (ఐచ్ఛికం)", en: "UPI ID (optional)" },
  s4: { hi: "Rate list", te: "ధరల జాబితా", en: "Your rate list" },
  s5: { hi: "Aapki dukaan ready hai", te: "మీ దుకాణం సిద్ధం", en: "Your shop is ready" },
  shopName: { hi: "dukaan ka naam", te: "దుకాణం పేరు", en: "shop name" },
  ownerName: { hi: "aapka naam", te: "మీ పేరు", en: "your name" },
  city: { hi: "sheher / ilaka (Durg, Bhilai…)", te: "పట్టణం / ప్రాంతం",
          en: "city / locality (Durg, Bhilai…)" },
  upiSub: { hi: "Customer isi UPI ID pe pay karega — self-reported, verify nahi hota",
            te: "కస్టమర్ ఈ UPI ID కు చెల్లిస్తారు — self-reported",
            en: "Customers pay this UPI ID — self-reported, not verified" },
  skip: { hi: "baad me daalunga — skip", te: "తరువాత — వదిలేయి", en: "add later — skip" },
  rateSub: { hi: "Yeh rate chalega — badlo ya add karo. Daam ke bina bill nahi banega.",
             te: "ఇవే ధరలు — మార్చండి లేదా కొత్తవి చేర్చండి. ధర లేకుండా బిల్ రాదు.",
             en: "Starter rates — edit or add. Billing needs prices." },
  addItem: { hi: "+ item jodo", te: "+ వస్తువు చేర్చండి", en: "+ add item" },
  price: { hi: "daam ₹", te: "ధర ₹", en: "price ₹" },
  unit: { hi: "unit", te: "యూనిట్", en: "unit" },
  readySub: { hi: "Customer is QR ko scan karke judenge — print karke counter pe chipka do",
              te: "కస్టమర్లు ఈ QR స్కాన్ చేసి జాయిన్ అవుతారు — ప్రింట్ చేసి ఉంచండి",
              en: "Customers scan this QR to join — print it for your counter" },
  exPh: { hi: "Bolkar try karo:", te: "ఇలా చెప్పండి:", en: "Try saying:" },
  go: { hi: "Shuru karein", te: "ప్రారంభించండి", en: "Start selling" },
  next: { hi: "Aage", te: "తదుపరి", en: "Next" },
  back: { hi: "← peeche", te: "← వెనుకకు", en: "← back" },
  err: { hi: "Kuch gadbad — phir try karo", te: "తప్పు — మళ్లీ చూడండి",
         en: "Something went wrong — try again" },
  needName: { hi: "Dukaan ka naam toh batao", te: "దుకాణం పేరు చెప్పండి",
              en: "Your shop needs a name" },
};

const UNITS = ["piece", "kg", "g", "liter", "ml", "packet", "dozen"];

export default function Onboarding() {
  const router = useRouter();
  const [lang] = useLang();
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [btype, setBtype] = useState("kirana");
  const [vpa, setVpa] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [newItem, setNewItem] = useState({ name: "", price: "", unit: "piece" });
  const [delMode, setDelMode] = useState(false);
  const [delSel, setDelSel] = useState<Set<number>>(new Set());
  const [qr, setQr] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tok = localStorage.getItem("bk_token");
    if (!tok) { router.replace("/login"); return; }
    setToken(tok);
  }, [router]);

  async function createShop() {
    setBusy(true); setErr("");
    try {
      const r = await api.shopSetup({
        name: shopName, business_type: btype, vpa, city, starter: true });
      // the setup call returns a shop-bound token — switch to it
      setToken(r.token); localStorage.setItem("bk_token", r.token);
      setJoinCode(r.join_code);
      const cat = await api.catalog();
      setProducts(cat.products);
      const link = `${window.location.origin}/join/${r.join_code}`;
      setQr(await QRCode.toDataURL(link, { width: 220, margin: 1 }));
      setStep(3);
    } catch { setErr(pick(lang, S.err)); }
    finally { setBusy(false); }
  }

  async function updatePrice(p: any, rupees: string) {
    const paise = Math.round(parseFloat(rupees || "0") * 100);
    setProducts(products.map((x) =>
      x.id === p.id ? { ...x, price_paise: paise } : x));
    if (!isNaN(paise)) {
      try { await api.editProduct(p.id, { name_en: p.name_en,
        unit: p.unit, price_paise: paise, stock: p.stock }); } catch {}
    }
  }

  async function addNewItem() {
    if (!newItem.name.trim()) return;
    try {
      const r = await api.addProduct({
        name_en: newItem.name.trim(), unit: newItem.unit,
        price_paise: Math.round(parseFloat(newItem.price || "0") * 100) });
      setProducts([...products, r.product]);
      setNewItem({ name: "", price: "", unit: "piece" });
    } catch { setErr(pick(lang, S.err)); }
  }

  function toggleDel(id: number) {
    setDelSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  async function deleteSelected() {
    const ids = [...delSel];
    setBusy(true);
    try {
      await Promise.all(ids.map((id) => api.deleteProduct(id)
        .catch(() => {})));
      setProducts(products.filter((p) => !delSel.has(p.id)));
      setDelSel(new Set()); setDelMode(false);
    } finally { setBusy(false); }
  }

  const phrases = pick(lang, {
    hi: btype === "milk"
      ? ["“Ramesh ka doodh aaj nahi chahiye”", "“dudh ka bill”", "“aaj ka hisaab”"]
      : ["“2 kilo cheeni, 1 Maggi, Ramesh ke naam”", "“Ramesh ka khata”",
         "“aaj ka hisaab”"],
    te: ["“రెండు కిలో చక్కెర, రమేష్ పేరు”", "“రమేష్ ఖాతా”", "“ఈరోజు లెక్క”"],
    en: ["“2 kilo sugar for Ramesh”", "“Ramesh ka khata”", "“today's total”"],
  });

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata</div>
        <div className="progress-dots" aria-label={`step ${step + 1} of 5`}>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={i <= step ? "on" : ""} />))}
        </div>
      </header>
      <div className="flow-page" style={{ maxWidth: 520 }}>
        {err && <div className="banner" style={{
          background: "var(--bad-soft)", width: "100%" }}>{err}</div>}

        {step === 0 && (<>
          <h1 className="title">{pick(lang, S.s1)}</h1>
          <div className="list" style={{ width: "100%" }}>
            <input value={shopName} aria-label="shop name"
              onChange={(e) => setShopName(e.target.value)}
              placeholder={pick(lang, S.shopName)} />
            <input value={ownerName} aria-label="owner name"
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={pick(lang, S.ownerName)} />
            <input value={city} onChange={(e) => setCity(e.target.value)}
              placeholder={pick(lang, S.city)} aria-label="city" />
            <button className="primary big" onClick={() => {
              if (!shopName.trim()) return setErr(pick(lang, S.needName));
              setErr(""); setStep(1);
            }}>{pick(lang, S.next)}</button>
          </div>
        </>)}

        {step === 1 && (<>
          <h1 className="title">{pick(lang, S.s2)}</h1>
          <div className="type-cards">
            {TYPES.map((tp) => (
              <button key={tp.k}
                className={"type-card" + (btype === tp.k ? " sel" : "")}
                onClick={() => setBtype(tp.k)}>
                <span className="type-emoji" aria-hidden="true">{tp.emoji}</span>
                <b>{lang === "te" ? tp.te : lang === "en" ? tp.en : tp.hi}</b>
              </button>
            ))}
          </div>
          <div className="row" style={{ justifyContent: "space-between",
            width: "100%" }}>
            <button className="link" onClick={() => setStep(0)}>
              {pick(lang, S.back)}</button>
            <button className="primary big" style={{ width: "auto",
              padding: "0 32px" }} onClick={() => setStep(2)}>
              {pick(lang, S.next)}</button>
          </div>
        </>)}

        {step === 2 && (<>
          <h1 className="title">{pick(lang, S.s3)}</h1>
          <div className="list" style={{ width: "100%" }}>
            <div className="row">
              <UpiIcon size={22} />
              <input value={vpa} onChange={(e) => setVpa(e.target.value)}
                placeholder="dukaan@upi" aria-label="UPI ID"
                style={{ flex: 1 }} />
            </div>
            <div className="caption">{pick(lang, S.upiSub)}</div>
            <button className="primary big" disabled={busy}
              onClick={createShop}>{pick(lang, S.next)}</button>
            <button className="link" disabled={busy} onClick={createShop}>
              {pick(lang, S.skip)}</button>
          </div>
        </>)}

        {step === 3 && (<>
          <h1 className="title">{pick(lang, S.s4)}</h1>
          <div className="caption">{pick(lang, S.rateSub)}</div>
          <div className="surface" style={{ width: "100%",
            padding: "4px 14px" }}>
            <div className="list">
              {products.map((p) => (
                <div className={"entry" + (delSel.has(p.id) ? " sel" : "")}
                  key={p.id}
                  role={delMode ? "button" : undefined}
                  aria-pressed={delMode ? delSel.has(p.id) : undefined}
                  onClick={delMode ? () => toggleDel(p.id) : undefined}
                  style={delMode ? { cursor: "pointer" } : undefined}>
                  {delMode && (
                    <span className={"selbox" +
                      (delSel.has(p.id) ? " on" : "")} aria-hidden="true">
                      {delSel.has(p.id) && <CheckIcon size={15} />}</span>)}
                  <span style={{ fontWeight: 600 }}>{p.name_en}
                    <span className="dim"> · {p.unit}</span></span>
                  {!delMode && (
                  <span className="row" style={{ gap: 6 }}>
                    <span className="dim">₹</span>
                    <input inputMode="decimal" aria-label={`price ${p.name_en}`}
                      style={{ width: 74, textAlign: "right", minHeight: 40 }}
                      defaultValue={(p.price_paise / 100).toString()}
                      onBlur={(e) => updatePrice(p, e.target.value)} />
                  </span>)}
                </div>
              ))}
              {!products.length && <div className="empty-state">
                {pick(lang, S.rateSub)}</div>}
            </div>
          </div>
          <div className="row" style={{ width: "100%", gap: 8 }}>
            <input value={newItem.name} aria-label="new item name"
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              placeholder={pick(lang, S.addItem)}
              style={{ flex: 1, minWidth: 0, fontSize: 15,
                minHeight: 46, padding: "0 14px" }} />
            <input value={newItem.price} inputMode="decimal"
              aria-label="new item price"
              style={{ width: 70, minHeight: 46, fontSize: 15,
                padding: "0 10px", textAlign: "right" }}
              placeholder={pick(lang, S.price)}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} />
            <select value={newItem.unit} aria-label="new item unit"
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              style={{ width: 92, minHeight: 46, fontSize: 14,
                padding: "0 6px" }}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <button className="tonal" onClick={addNewItem}
              aria-label="add item">+</button>
            {delMode ? (
              <button className="danger" disabled={!delSel.size || busy}
                onClick={deleteSelected}
                aria-label="delete selected">
                {delSel.size ? `Delete (${delSel.size})` : "Delete"}</button>
            ) : (
              <button className="tonal" onClick={() => {
                setDelMode(true); setDelSel(new Set());
              }} aria-label="delete items">🗑</button>
            )}
          </div>
          {delMode && (
            <div className="caption" style={{ marginTop: -8 }}>
              {pick(lang, { hi: "item chuno, phir Delete dabao",
                te: "వస్తువులు ఎంచుకుని Delete నొక్కండి",
                en: "tap items to select, then press Delete" })}
            </div>)}
          <div className="row" style={{ justifyContent: "space-between",
            width: "100%" }}>
            <span />
            <button className="primary big" style={{ width: "auto",
              padding: "0 32px" }} onClick={() => setStep(4)}>
              {pick(lang, S.next)}</button>
          </div>
        </>)}

        {step === 4 && (<>
          <h1 className="title" style={{ textAlign: "center" }}>
            {pick(lang, S.s5)}</h1>
          <div className="qr-tile">
            {qr && <img src={qr} alt="customer join QR" width={190} />}
            <div className="caption" style={{ fontWeight: 700 }}>
              {joinCode}</div>
          </div>
          <div className="caption" style={{ textAlign: "center",
            maxWidth: 360 }}>{pick(lang, S.readySub)}</div>
          <div className="surface tonal" style={{ width: "100%" }}>
            <b style={{ fontSize: 14 }}>{pick(lang, S.exPh)}</b>
            {phrases.map((p) => <div key={p} style={{ marginTop: 6 }}>{p}</div>)}
          </div>
          <button className="primary big" style={{ width: "100%" }}
            onClick={() => { localStorage.setItem("bk_new_owner", "1");
              router.replace("/app"); }}>
            {pick(lang, S.go)}</button>
        </>)}
      </div>
    </main>
  );
}
