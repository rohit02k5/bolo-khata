# Demo script

Two versions: **A) 75 s full** and **B) 60 s cut**. Two phones.
Nothing mocked — every number on screen is live.

**Setup:** owner phone logged in, backend warm (FINAL_CHECKLIST),
customer = second phone. Captions in Hindi/Telugu as spoken, English
subtitles below.

## A) 75 s

| t | Action | Voiceover / caption |
|---|---|---|
| 0–8 | Exterior/interior kirana, owner at counter | "60 million kiranas run on spoken udhaar. Memory argues back. Bolo Khata makes the ledger listen." / "भारत की दुकानें उधार पर चलती हैं।" |
| 8–28 | Hold mic: **"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"** → live transcript → itemized card ₹174 → Timbre read-back | "Bolo — Prisma hears code-mixed Hindi over shop noise. Rules turn it into a priced bill. Timbre says it back." / "बोलिए — दुकान के शोर में भी।" |
| 28–38 | Tap **Khata** → stock ticks down | "One tap: khata, cash, or UPI QR — stock moves with real units." |
| 38–52 | Customer phone opens `/c/[token]` → same bill → taps **Confirm** → owner screen flips pending→confirmed | "The customer confirms on their own phone. Udhaar becomes agreed, not argued." / "ग्राहक अपने फ़ोन पर पुष्टि करता है।" |
| 52–64 | Owner: **"Ramesh ka doodh kal se 2 din nahi chahiye"** → confirm → **"dudh ka bill"** → ₹ adjusted live | "Skip-day billing — milk and newspaper math a milkman already does in his head." |
| 64–75 | `/benchmark` on screen → close | "1,008 real speech jobs measured. Prisma + Timbre carry the voice; rules carry the money. Bolo Khata — IIT Bhilai." |

## B) 60 s cut

Drop the delivery section (52–64) and compress intro to 5 s:
problem → hero bill → customer confirm → benchmark close.

## Telugu variant (swap-in for judge reel)

At 8–28 instead: **"రెండు కిలో పంచదార, రమేష్ పేరు"** → same card →
Telugu read-back. Shows `indic-auto` switching languages mid-demo.

## Failure fallbacks

- STT hiccup → same phrases in `commands.json`; Streamlit fallback
  (`NoiseLab/bolta_app.py`) reproduces the ledger offline.
- TTS stall → tap speaker again (`tts.py` retries); worst case read
  the card aloud, keep going.
- Site down → restart per FINAL_CHECKLIST; ledger persists in SQLite,
  resume mid-flow.
