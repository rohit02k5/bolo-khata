# Submission — Bolo Khata

**One line:** a voice-first business ledger for India's neighbourhood
shops — the shopkeeper talks in Hinglish or Telugu, even in a noisy
shop, and bills, stock, khata and reminders update, with trust built in
through two-sided confirmation.

## What it does

Speak: `"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"`.
Bolo Khata transcribes it live, shows an itemized confirmation card
(₹174), reads it back aloud in the shopkeeper's language, and only then
writes — Cash, UPI (QR), or Add to Khata. Stock deducts with correct
units. If it's khata, the customer gets a link on their own phone:
**Confirm** or **Dispute** — the ledger only settles when both sides
agree.

The same voice surface covers:

- **Queries** — "chini kitni bachi hai", "baaki", "aaj ka hisaab",
  "is hafte ka hisaab" (top sellers, run-out estimates, top debtors —
  all DB-computed).
- **Stock** — stock-in, stock-out adjustments, low-stock flags, reorder.
- **Reminders** — restock checklist; "Ramesh ko yaad dilao" → Timbre
  voice note + a playable link on the customer's phone.
- **Deliveries** — milk/newspaper skip-day billing: "kal se 2 din dudh
  nahi chahiye" → skips; "dudh ka bill" → month bill = days−skips.
- **Staff** — assistant login (bills/stock only; undo and settings are
  owner-only, enforced server-side); leave needs owner-mark + staff-
  confirm (dual approval, audited).
- **Customer app** — join via counter QR (+PIN) → multi-shop khata,
  pending confirms, expense charts, reminder audio in `/m`.
- **Business types** — kirana / milk / newspaper / fruit-veg / other,
  as schema-validated module configs.
- **Judge sandbox** — `/try`, no signup, synthetic data, resets daily.

## Where Gnani is load-bearing

- **Prisma v3.0 (streaming STT)** — `indic-auto` auto-detects
  Hindi/Telugu/English mid-utterance; `transcribe` yields digits;
  `keyterms` biases toward the shop's catalog and customer names.
  ~100–180 ms per utterance measured over our relay.
- **Timbre v2.5 (TTS)** — read-backs and voice-note reminders in
  `hi-en` (Poorvi) and `te-IN` (Suhana), ~1.3 s buffered.

Extraction is deterministic rules — deliberately (closed grammar, real
catalog prices, human confirm card; see CODE_TOUR.md). No other LLM is
used anywhere. Evon has no callable API — verified, unused, unclaimed.

## Evidence

- `/benchmark` — NoiseLab's measured matrix (1,008 real Prisma jobs,
  88.1% clean / 86.9% telephony, per-language splits, failures shown)
  plus live v3.0 spot checks, honestly labeled.
- 218 offline pytest tests — bill math, unit conversion, two-sided
  confirm, undo reversal, idempotency, delivery billing, RLS-style role
  gates, leave dual-approval, config validation, rate limits.
- One-command `scripts/smoke.py`: real TTS→STT→parse pass/fail+latency.
- `scripts/score_recordings.py` + `benchmarks/` kit for the recorded
  20-phrase × 4-condition scoring run.

## Trust engineering

Integer paise, append-only ledger, undo-as-reversal, idempotent writes,
token-scoped public pages, PIN-hashed customer/staff auth, per-IP rate
limits, server-side role gates, raw mic audio never stored, UPI labeled
self-reported, DPDP-aware minimal data.

## Repo

`github.com/rohit02k5/bolo-khata` — FastAPI backend + vendored
bolta/noiselab core · Next.js PWA · `render.yaml`/`vercel.json` +
DEPLOY.md · Streamlit fallback in NoiseLab.
