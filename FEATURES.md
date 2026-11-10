# Bolo Khata — everything it does

One-line: a voice-first business ledger for India's neighbourhood shops.
The shopkeeper talks in Hinglish or Telugu — even in a noisy shop — and
bills, stock, khata and reminders update, with trust built in through
two-sided confirmation.

Built with Gnani AI: **Prisma** (streaming speech-to-text) +
**Timbre** (text-to-speech). Understanding is a deterministic rules
parser — bounded to the shop's own catalog, it can never hallucinate a
price.

---

## 🛒 Dukaan side (owner)

### Voice billing
- Speak naturally: `"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke
  naam"` → live transcript → itemized bill (₹174) → Timbre read-back.
- Hinglish, Telugu, English — auto-detected mid-stream.
- Editable transcript and editable bill lines — the owner reviews and
  fixes before anything writes.
- **Ask-back, never guesses**: unknown or ambiguous items/customers open
  a tappable card — similar items, ambiguity chooser, one-tap
  "Naya item banayein" (quick-create with price) — and the question is
  spoken aloud via Timbre.

### Money
- Cash / **UPI QR** (self-reported — the owner verifies the payment) /
  Add to Khata.
- Confirming a khata bill generates a **customer confirm link** — the
  itemized receipt goes to the customer's phone over WhatsApp/SMS.
- Stock auto-decrements on every bill; stock queries by voice:
  `"chini kitni bachi hai"`, `"dahi khatam ho gaya"` (stock-out adjust),
  `"20 kilo gehu aaya"` (restock-in), `"aaj ka hisaab"` (spoken daily
  summary), `"baaki"` (total receivable).

### Deliveries & recurring business
- Milk / newspaper model: `"Ramesh ka doodh kal se 2 din nahi chahiye"`
  → skip days; `"dudh ka bill"` → month bill = days − skips.
- Business-type packs: kirana, doodh, akhbaar, sabzi, other — each gets
  a starter catalog, tab labels and modules tuned to that shop.

### Staff
- Assistant login: can bill and adjust stock; undo/settings are
  owner-only **server-side** (403-gated).
- Leave = owner marks → staff confirms — dual approval, append-only
  audit trail. Owner can undo a wrong entry (`"galat, wapas"`).

### Reminders & insights
- `"Ramesh ko yaad dilao"` → a voice-note reminder page (`/r/`) plays a
  spoken reminder in the customer's own language — no awkward calls.
- `"is hafte ka hisaab"` → weekly spoken insight: top sellers, stock
  running out, biggest udhaar.

---

## 📱 Customer side (`/m` — no download, works in browser)

- **Join at the counter**: scan the shop's join QR / enter the code →
  name + 4-digit PIN (no email needed) → their own khata opens.
- **Multi-shop khata**: every linked shop's balance in one place.
- **Two-sided trust**: each khata entry arrives as a pending itemized
  receipt → **Confirm** locks it, **Dispute** flags it for the owner.
  Both sides keep the same record — "maine kab liya?" jhagda over.
- **Expense view**: spends across shops, pending confirms, reminder
  audio playback.
- Customers without the app still get the plain confirm link — no
  signup required to verify a bill.

---

## 🔒 Trust, honesty, proof

- Nothing writes silently: every bill is a proposal → owner confirm →
  customer confirm. Reversals are append-only (undo), never silent edits.
- UPI is labelled **self-reported** everywhere — the app never claims a
  payment it can't verify.
- **Noise-tested**: 504 real API benchmark runs (clean / traffic /
  babble / telephony) published on `/benchmark` — failures included.
- Judge sandbox at `/try`: no signup, synthetic data, resets daily.

## ⚙️ Under the hood

FastAPI + SQLite backend (multi-tenant, one shop = one ledger),
Next.js/React frontend, PCM16 16 kHz audio over WebSocket → Prisma v3.0
streaming → deterministic parser → catalog fuzzy match → bill sheet.
Timbre v2.5 for every spoken reply and reminder.

`docs/proof/` holds raw screen recordings of the real flows; the brand
film and honest demo video live on the `film` branch under `video/`.
