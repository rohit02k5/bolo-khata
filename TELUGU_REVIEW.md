# Telugu review — for Rohit's ear

Every Telugu string the app speaks or shows. Mark ✅ / fix inline; anything
marked "Timbre digits" relies on Timbre normalizing the numeral — flag it if
it reads wrong.

## speak_text.py (one-liners)

| Context | Text |
|---|---|
| Write success | `సరే, రాశాను.` ("ok, wrote it") |
| Rejected/not written | `సరే, రాయలేదు.` |
| Didn't understand | `అర్థం కాలేదు, మళ్లీ చెప్పండి.` |

## Spoken read-backs (pipeline templates)

| Context | Template | Example |
|---|---|---|
| Bill confirm | `{cust} ఖాతాలో {n} వస్తువులు, మొత్తం {amt} రూపాయలు. సరియేనా?` | `రమేష్ ఖాతాలో 3 వస్తువులు, మొత్తం 174 రూపాయలు. సరియేనా?` |
| Daily summary | `ఈరోజు {n} బిల్లు — {sales} రూపాయలు (ఉధార్ {credit})` | `ఈరోజు 12 బిల్లు — 1840 రూపాయలు (ఉధార్ 400)` |
| Delivery skip confirm | `{cust} {product} — {date} నుండి {count} రోజులు స్కిప్. సరియేనా?` | `రమేష్ Doodh — 2026-11-09 నుండి 2 రోజులు స్కిప్. సరియేనా?` |
| Month bill | `{cust} {product} — {days} రోజులు డెలివరీ, {skips} స్కిప్, {amt} రూపాయలు` | `రమేష్ Doodh — 28 రోజులు డెలివరీ, 2 స్కిప్, 756 రూపాయలు` |
| Voice-note reminder | `నమస్తే {name} గారూ, {shop} నుండి గుర్తు చేస్తున్నాం — మీ బాకీ {amt} రూపాయలు ఉంది. ధన్యవాదాలు.` | `నమస్తే రమేష్ గారూ, Sharma Kirana Store నుండి గుర్తు చేస్తున్నాం — మీ బాకీ 4604 రూపాయలు ఉంది. ధన్యవాదాలు.` |

## Mic caption

| Context | Text |
|---|---|
| Listening | `చెప్పండి… మైక్ ఆన్ లో ఉంది` |

## On-screen chrome (page.tsx `T.te` — read on screen, not spoken)

| Context | Text |
|---|---|
| Tabs | కౌంటర్ · ఖాతా · స్టాక్ · జాబితా · దుకాణం |
| Idle | `చెప్పండి, వింటున్నాను` |
| Tap hint | `మైక్ నొక్కి చెప్పండి` |
| Thinking | `అర్థం చేస్తున్నాను…` |
| Speaking | `చెబుతున్నాను…` |
| Placeholder | `“రెండు కిలో పంచదార, రమేష్ పేరు”` |
| CTAs | `క్యాష్` · `UPI` · `ఖాతాలో రాయి` · `ఇప్పుడే చెల్లింపు` · `సరే` · `వద్దు` |
| Undo | `↩︎ రద్దు` |
| Ledger heads | `ఈరోజు లెక్క` · `నిర్ధారణ కావాలి` · `ఎవరు ఎంత ఇవ్వాలి` · `ఇటీవల` |
| Empty | `ఏమీ లేదు — అంతా సరే ✓` |
| List heads | `స్టాక్ జాబితా` · `హోల్‌సేల్ వచ్చినప్పుడు` · `వాయిస్ రిమైండర్లు` · `రోజువారీ డెలివరీలు` · `ఈ వారం` |
| Search | `పేరు వెతకండి…` |
| UPI note | `కస్టమర్ UPI తో చెల్లిస్తారు — self-reported` |
| Join QR | `కస్టమర్ QR — దుకాణంపై అతికించండి` |
| Powered | `Gnani AI · Prisma + Timbre తో నిర్మితం` |
| Errors | `మైక్ తెరవలేదు — permission చూడండి` · `అర్థం కాలేదు — మళ్లీ చెప్పండి` · `ఏమీ వినపడలేదు — మళ్లీ చెప్పండి` |
| Staff mode | `👷 స్టాఫ్ మోడ్ — బిల్లింగ్ + స్టాక్ మాత్రమే` |

## Catalog — Telugu names/aliases in seed.py

పాలు (doodh), పెరుగు (dahi), చక్కెర/పంచదార (chini), బియ్యం (chawal),
పప్పు (daal), గోధుమ పిండి (aata), నూనె (tel), బిస్కెట్ (parle-g),
సబ్బు (sabun), షాంపూ (shampoo), గుడ్లు (anda), బ్రెడ్ (pav),
టీ పత్రి (chai), నమ్కీన్ (namkeen), అగ్గిపెట్టె (matchbox),
సర్ఫ్ (surf), టూత్ పేస్ట్ (toothpaste), కురకురె (kurkure),
నెయ్యి (ghee), శనగ పిండి (besan), మసాలా (masala), సాస్ (sauce),
పేపర్/వార్తాపత్రిక (akhbar), కోక్ (coke), మ్యాగీ/మ్యాగీ నూడిల్స్ (maggi)

Units: కిలో, గ్రాము (gram), ప్యాకెట్, లీటరు implied via aliases.
Customer names: రమేష్, రాహుల్, సునీత, లక్ష్మీ, కాకా, ప్రియా, మోహన్,
గీత, విజయ్, ఫాతిమా, సురేష్, అనిత — plus tail markers `పేరు`, `గారి`.

## Verified by ear

- [ ] Bill read-back (Timbre Suhana, te-IN)
- [ ] Voice-note reminder
- [ ] Month bill + skip confirm
- [ ] Digit handling in amounts (e.g. 174 → "వంద డెబ్బై నాలుగు"?)

## design-v2 additions (UI chrome, pending ear review)
- నగదు = Cash · UPI · ఖాతాలో రాయి = Khata me likho
- ఇప్పుడే చెల్లింపు = Abhi paid · సరే/వద్దు = ok/no · వద్దు = cancel (shared)
- డార్క్ మోడ్ / లైట్ మోడ్ = theme menu items
- ఇలా చెప్పండి = "Try saying" · ఈరోజు = "Aaj/Today" · వివరాలు = Details
- రద్దు = undo · రిఫ్రెష్ = refresh

## product-v1 additions (pending ear review)

Ask-back (spoken + shown):
- జాబితాలో లేదు — ఏం చేయాలి? = "list me nahi mila — kya karein?"
- ఏది? = "Kaun sa?" · కొత్త వస్తువు చేయండి = "Naya item banayein"
- కొత్త కస్టమర్ — చేర్చాలా? = "naya customer — jodein?" · చేర్చండి = "Jodo"
- తీసేయండి = "Hata do" · ఎంత? = "Kitna?" · చేయండి = "Banao" (create)
- ధర ₹ = "daam ₹" · వస్తువు = item
- స్క్రిప్టెడ్ టెస్ట్ = "scripted test" (say-hook label)
- మళ్లీ అర్థం చేయి = "Dobara samjho" (re-parse) · సవరించింది = "edited"

Onboarding / signup / start:
- మీ భాష ఎంచుకోండి = "Apni bhasha chunein"
- దుకాణదారు / సర్వీస్ ప్రొవైడర్ = "Dukaan wala"
- కస్టమర్ = customer · మీ దుకాణం అకౌంట్ = "Apni dukaan ka account"
- పాస్‌వర్డ్ (8+, ఒక నంబర్) = password rule · చూపు/దాచు = show/hide
- దుకాణం కోడ్ (QR కింద ఉంటుంది) = "dukaan code"
- కొనసాగండి = "Aage badho" · వెనక్కి = "wapas"
