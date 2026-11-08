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
