# Submission — Bolo Khata

**One line:** a voice-first business ledger for India's neighbourhood
shops — the shopkeeper talks in Hinglish or Telugu, even in a noisy
shop, and bills, stock, khata and reminders update, with trust built in
through two-sided customer confirmation.

## What it does

Speak: `"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"`.
Bolo Khata transcribes it live, shows an itemized confirmation card
(₹174), reads it back aloud in the shopkeeper's language, and only then
writes — Cash, UPI (QR), or Add to Khata. Stock deducts with correct
units (500 g off a kg-stocked item deducts 0.5). If it's khata, the
customer gets a link on their own phone: **Confirm** or **Dispute** —
the ledger only settles when both sides agree.

Beyond bills, the same voice surface does stock queries
("chini kitni bachi hai"), restock checklists ("next time 20 kilo gehu
mangwana"), voice-note reminders sent as audio links ("Ramesh ko yaad
dilao"), daily summaries ("aaj ka hisaab"), milk/newspaper skip-day
billing ("Ramesh ka doodh kal se 2 din nahi chahiye", "dudh ka bill"),
undo ("galat, wapas"), and a counter QR for customer self-onboarding.

## Where Gnani is load-bearing

- **Prisma v3.0 (streaming STT)** — `indic-auto` auto-detects
  Hindi/Telugu/English mid-utterance; `transcribe` format yields digits;
  `keyterms` biases toward the shop's own catalog and customer names.
  Measured ~100–180 ms per utterance over our WebSocket relay.
- **Timbre v2.5 (TTS)** — confirmation read-backs in `hi-en` (Poorvi)
  and `te-IN` (Suhana), ~1.3 s buffered; also generates the voice-note
  reminders customers can play from a link.

Extraction is deterministic rules — deliberately. The ledger grammar is
closed (qty × unit × item × customer), every token must resolve to a
real catalog row, and a deterministic failure is safer than a confident
hallucination near money. Full rationale + interview Q&A in
`CODE_TOUR.md`. No other LLM is used anywhere.

## Evidence

- `frontend/app/benchmark` — NoiseLab's measured matrix: 1,008 real
  Prisma jobs, 88.1% action-success clean / 86.9% telephony-degraded,
  per-language splits, honest failure taxonomy; plus live v3.0 spot
  checks labeled separately.
- 207 offline pytest tests (bill math, unit conversion, two-sided
  confirm, undo reversal, idempotency, delivery billing).
- Append-only ledger, integer paise, idempotent writes, token-scoped
  public pages, secrets server-side only.

## Repo

`github.com/rohit02k5/bolo-khata` — backend (FastAPI, vendored
bolta/noiselab core), frontend (Next.js PWA), deploy configs
(`render.yaml`, `vercel.json`, `DEPLOY.md`).
