# Bolo Khata — voice-first kirana ledger

A shopkeeper speaks in Hinglish or Telugu — even in a noisy shop — and
bills, stock and khata update, with trust built in through two-sided
customer confirmation.

**Live: https://bolo-khata.onrender.com** — free tier sleeps after ~15
min idle; first hit takes ~30–60 s to wake. Full feature list:
`FEATURES.md`.

**Gnani models used (load-bearing):**

| Stage | Model | Why it matters |
|---|---|---|
| Speech → text | **Prisma v3.0** streaming (`wss://api.vachana.ai/stt/v3/stream`, `indic-auto`) | Auto-detects Hindi/Telugu/English mid-stream, telephonic-audio-trained, `transcribe` format yields digits; ~100–180 ms per utterance measured |
| Understanding | **Deterministic rules** (vendored `bolta` parser + `noiselab.normalize`) | Not a Gnani LLM — see "why rules" below |
| Text → speech | **Timbre v2.5** REST (`/api/v1/tts/inference`) | Read-backs + voice-note reminders in Hindi/Hinglish (`hi-en`) and Telugu; ~1.3 s buffered |

**Evon v3.3 is not used** — it has no public API: Gnani API access is
closed-beta waitlist only, and the FriendliAI listing is a paid
dedicated-GPU endpoint (~$4–12/hr), not a callable model API. Verified
2026-11-08. Extraction is intentionally rules-based: the ledger's
grammar is small (qty × unit × item × customer × intent), bounded to a
catalog, and must never hallucinate a price — deterministic parse +
fuzzy match + human confirm card is the right tool, and it costs zero
latency and zero credits. See `CODE_TOUR.md` for the interview Q&A.
No third-party LLM is used anywhere in the product.

## Hero flow

`"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"` →
live transcript → itemized bill (₹174) → Timbre read-back →
Cash / UPI / Khata → stock deducts → customer gets a WhatsApp/SMS deep
link → **Confirm / Dispute** updates the ledger state
(`pending → confirmed|disputed`).

Beyond the hero flow, the same voice surface covers:

- **Stock & queries** — `"chini kitni bachi hai"`, `"20 kilo gehu aaya"`,
  `"dahi khatam ho gaya"` (stock-out adjust), `"aaj ka hisaab"` (daily
  summary spoken back), `"baaki"`.
- **Restock & reminders** — `"next time 20 kilo gehu mangwana"` →
  checklist; `"Ramesh ko yaad dilao"` → Timbre voice note + public
  playback link with the real balance read from the DB.
- **Daily deliveries** — `"Ramesh ka doodh kal se 2 din nahi chahiye"` →
  skip days; `"dudh ka bill"` → month bill = days-in-month − skips
  (milk/newspaper billing).
- **Customer onboarding** — join QR at the counter → `/join/[code]`
  (+optional PIN → full khata app at `/m`: multi-shop balances, pending
  confirms, expense charts, reminder audio).
- **Staff** — assistant login (bill/stock only; undo + settings are
  owner-only server-side); leave = owner-marks, staff-confirms,
  append-only audit.
- **Weekly insights** — `"is hafte ka hisaab"` → top sellers, run-out
  estimates, top debtors, spoken back.
- **Business types** — kirana / milk / newspaper / fruit-veg / other as
  schema-validated module configs.
- **Judge sandbox** — `/try`, no signup, synthetic data, daily reset,
  per-IP cap.
- **Undo** — append-only reversal: `"galat, wapas"` / deny after a write.
- **Checkout** — Cash / **UPI QR** (`upi://` deep link) / Add to Khata.

## Repo layout

```
backend/            FastAPI + vendored bolta/noiselab core
  app/relay.py      browser mic -> Prisma streaming WS relay
  app/bill_parse.py multi-item bill extraction (extends bolta rules)
  app/db.py         SQLite ledger: paise, confirm tokens, audit, undo
  app/pipeline.py   transcript -> proposal -> confirm -> write
  app/tts.py        Timbre proxy (REST + SSE), retry on flaky edge
  tests/            218 tests, all offline
  schema.sql        Postgres/RLS reference for the deploy step
frontend/           Next.js PWA (mobile-first, dark, captions-friendly)
  app/page.tsx      counter / khata / stock / list / shop tabs, big mic
  app/c/[token]/    customer confirm page (public, token-scoped)
  app/join/[code]/  customer self-join from a QR at the counter
  app/r/[token]/    public voice-note reminder playback
  app/benchmark/    measured STT results, honest provenance
  app/about/        product + model roles
  app/lib/mic.ts    AudioWorklet -> PCM16 @16kHz -> WS
```

## Run locally

```bash
cd backend && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
cp .env.example .env        # fill GNANI_API_KEY etc.
.venv/Scripts/python -m uvicorn app.main:app --port 8000

cd frontend && npm install && npm run build && npx next start -p 3000
# open http://localhost:3000 (API calls go to :8000)
```

## Public URL

**Production: `https://bolo-khata.onrender.com`** — one Render Docker
service (repo-root `Dockerfile`): Next `next start` + FastAPI in one
container, backend proxies page traffic, so one URL serves UI + API +
WSS. Free tier sleeps when idle — see `DEPLOY.md`.

For local dev sharing: single ngrok tunnel → `http://localhost:8000`;
FastAPI proxies page traffic the same way. Start: `ngrok http 8000`.

## Fallback (labeled)

The original Streamlit prototype lives in `../NoiseLab/bolta_app.py`
(`.venv/bin/python -m streamlit run bolta_app.py`, port 8501). It shares
the same vendored ledger core and works fully offline — it's the
demonstrated fallback if the web stack fails during filming. It is a
prototype: single-owner, no web deploy, no customer-confirm links.

## Security & trust

- Gnani key never leaves the backend (`X-API-Key-ID` server-side only).
- Confirm links are unguessable UUID tokens exposing exactly one entry.
- Money is integer paise; ledger is append-only; undo = reversal row.
- Idempotency keys on writes; proposals expire after 5 min.
- `backend/scripts/check_secrets.py` fails on committed key patterns.
- No real personal data — synthetic seed only. UPI is self-reported
  (`upi://` deep link); we never claim verified payment.

## Known limits

- Prisma streaming emits final transcripts only (partials flag ignored)
  — UI shows "listening…" between speech_start and transcript.
- ngrok free shows a one-time interstitial to new browser visitors.
- 60 s server-side idle timeout on the STT stream; client reconnects.
- Telugu TTS voice exists (Suhana); verify phrasing with a native ear.
