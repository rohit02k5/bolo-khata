# Pitch deck — outline (7 slides)

## 1. Problem
India's ~60M kiranas run on spoken credit. The ledger lives in memory
and memory disagrees — with customers, at month-end, forever. Digital
ledgers failed here because typing at a counter is slower than talking.

## 2. Product
Bolo Khata: the shopkeeper talks; the ledger updates. One sentence —
*"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"* — becomes an
itemized, spoken-back, customer-confirmed entry. (Screenshot: bill card
+ mic.)

## 3. Why it's trusted
Two-sided confirmation — customer gets a link, taps Confirm or Dispute;
ledger settles on agreement. Append-only, undo-as-reversal, integer
paise. Not a voice calculator — an *agreed* ledger.

## 4. Why it works in a real shop (tech)
- **Prisma streaming**: `indic-auto` code-mixed Hinglish/Telugu,
  telephonic noise, ~100–180 ms, catalog `keyterms` biasing.
- **Timbre**: read-backs + voice-note reminders in the owner's language.
- **Deterministic rules** for extraction: closed grammar, real catalog
  prices, zero hallucination surface near money. (Full rationale:
  CODE_TOUR.md.)

## 5. Evidence
/benchmark: 1,008 real STT jobs — 88.1% action-success clean, 86.9%
telephony, per-language splits, failure taxonomy shown. 207 offline
tests. (Screenshot: benchmark page.)

## 6. Breadth
Bills · khata · UPI QR · stock-in/out · restock checklist · voice-note
reminders · daily summary · milk/newspaper skip-day billing · undo ·
customer join QR. One voice surface, no modes.

## 7. Roadmap
Assistant role + approval flows, multi-shop, WhatsApp Business API
sends, offline-first PWA queue, regional packs (chemist, tiffin),
Postgres + RLS (schema ready).
