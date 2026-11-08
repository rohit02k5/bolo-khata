# Pitch deck — 5 slides

## 1. The udhaar problem
India's ~60M neighbourhood shops run on spoken credit — "likh dena" —
remembered by both sides and argued at month-end. Digital ledgers lost
because typing at a counter is slower than talking. **Talk is the
interface.**
[photo: counter, khata book]

## 2. Bolo Khata — speak it, it's settled
*"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"* → itemized
bill → spoken read-back → Cash/UPI/Khata → customer confirms on their
own phone (Confirm/Dispute). Also: stock, restock lists, voice-note
reminders, daily/weekly summaries, milk/newspaper skip-day billing,
undo — one voice surface, no modes.
[screenshot: mic → bill card → customer confirm]

## 3. Why it's trusted, not just clever
Two-sided confirmation — the ledger isn't settled until the customer
says so. Append-only entries, undo-as-reversal, integer paise, token-
scoped links, staff roles with dual-approval leave. The customer's app
(/m) shows their khata across shops.
[diagram: pending → confirmed/disputed]

## 4. Why it works in a real shop
**Gnani Prisma** streams code-mixed Hinglish/Telugu over counter noise —
`indic-auto` catches mid-sentence language switches, catalog keyterms
bias it, ~100–180 ms. **Gnani Timbre** speaks confirmations in the
shopkeeper's language — the step a low-literacy user actually trusts.
Extraction is **deterministic rules**: closed grammar, real catalog
prices, zero hallucination surface near money.
/benchmark: 1,008 real jobs — 88% clean, 87% telephony, failures shown.

## 5. Breadth → business
Module presets per business type: kirana, milk/newspaper delivery
(delivered-days minus skips), fruit/veg, other (schema-validated
choices). Contrast deliberately: access businesses like gyms bill
without absence adjustment. Roadmap: telephony mode, UPI gateway
verification, full offline, assistant roles at scale.
IIT Bhilai · built for the Gnani AI Internship Challenge.
