# Brand film — claims table

Every on-screen super and VO line → real built feature → evidence file.
Nothing here claims a capability that isn't implemented and recorded.

## Voice-over lines (narration: Gnani Timbre, audio/voNN.wav)

| Line | Feature | Evidence |
|---|---|---|
| Subah aath baje. Teen customer ek saath. Aur khata? Wahi phata hua register. | Context hook (illustration, not a product claim) | video/motion/player.html scene 1 (labelled "illustration") |
| Ab bas… bolo. | Voice-first entry | video/footage/hero.webm (real mic turn) |
| Do kilo cheeni, ek Maggi, paanch sau gram daal, Ramesh ke naam. Rs 174. Done. | Voice → bill via Gnani Prisma + rules parser | video/footage/hero.webm shows ₹174/Ramesh; backend/tests (hero regression) |
| Customer ko link milta hai, bill uske phone pe. Sahi hai ya galat, dono ke saamne. Jhagde kam. | Two-sided confirm/dispute link | video/footage/trust.webm (/c/ page, Confirm/Dispute) |
| Naya item? App poochta hai, andaaza nahi lagata. | Unknown-item ask-back + quick-create | video/footage/askback.webm ("Kaun sa? face cream" → ₹40 create) |
| Cash, UPI QR ya udhaar. Stock bhi apne aap ghat-ta hai. | 3 payment modes; stock auto-decrement | video/footage/money.webm (pay sheet + QR); stock decrement covered by backend tests |
| Customer QR scan kare, apna khata khule. Kitne dukaan, kitna kharcha, sab ek jagah. | Customer join + multi-shop khata + chart | video/footage/customer.webm (/m two shops) |
| Paise maangna awkward hai? App izzat se awaaz me yaad dilata hai. | Spoken reminder /r/ pages | video/footage/voicenote.webm + audio/reminder*.wav (real Timbre) |
| Doodh wala ho ya kirana: deliveries, chhutti, hisaab. Assistant chalaye, aap dekhte raho. | Milk pack, staff role + leave approval, weekly insights | video/footage/milk.webm, staff.webm, weekly.webm |
| Hinglish, Telugu, English. Apni dukaan jaisi. | Multi-language STT + business-type packs | video/footage/telugu.webm (₹90 Telugu bill), onboarding.webm |
| Shor me test kiya. Nateeje public. Galtiyan bhi. | Public benchmark incl. failures | video/footage/benchmark.webm (/benchmark NoiseLab + honesty notes) |
| Bolo. Khata likh gaya. | Tagline | n/a |

## On-screen supers

| Text | Evidence |
|---|---|
| आधा लिखा. आधा याद. / "illustration" | Illustrated hook — labelled |
| "2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam" | Real transcript — video/footage/hero.webm |
| ₹174 / Ramesh / LIKH DIYA | Real bill+stamp — video/footage/hero.webm |
| "Gnani Prisma: asli awaaz, asli speech-to-text" | Prisma STT — backend relay + footage |
| "bill uske phone pe" / CONFIRMED / "dono taraf confirm" | /c/ confirm page — trust.webm |
| "face cream"? list me nahi. / "app poochta hai" / "jab pata na ho, poochta hai" | Ask-back — askback.webm |
| Cash ✓ / UPI QR / Khata / stock −2 | Pay sheet + stock — money.webm + tests |
| "UPI: self-reported — aap verify karte ho" | App labels UPI self-reported — money.webm |
| "customer ka apna khata" / "kitne dukaan, kitna kharcha — ek jagah" | /m two shops — customer.webm |
| "paise maangna awkward hai?" / "awaaz me yaad dilaata hai" / "voice-note reminder" | /r/ page — voicenote.webm |
| "doodh · akhbaar · kirana · staff" | business packs + staff — milk/staff/onboarding.webm |
| "Hinglish · తెలుగు · English" / "apni dukaan jaisi" | telugu.webm ₹90 bill |
| "504 noisy runs." / "failures bhi public." / caption "Clean 88% · traffic 80% · babble 68%" | Live /benchmark page — benchmark.webm (84×6=504 jobs, 88.1/79.8/67.9%) |
| "voice recorded earlier, played into the app" | Labels on every non-live voice shot (scenes 3,5,6,9,10) |
| "Narration: Gnani Timbre" | No vo.wav exists → Timbre VO used |
| "Built with Gnani AI: Prisma + Timbre" | Required credit line |
| "Bolo Khata — India's voice-first ledger for dukaans · Built at IIT Bhilai" | End card |

## Explicitly NOT claimed
- No "verified", "tamper-proof", "never wrong", "guaranteed" anywhere.
- UPI marked self-reported (app's own label), never implied auto-verified.
- No WhatsApp/UPI/GPay logos — generic message bubble + the app's own QR tile.
- No real people or phone numbers; all names are demo seeds.
- 1,008-run figure from brief ≠ live page; film shows the real **504** as on /benchmark.
