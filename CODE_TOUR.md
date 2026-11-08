# Code tour — Bolo Khata

Where things live, and the questions a judge/interviewer will ask.

## Request path (hero flow)

```
mic (AudioWorklet, PCM16 @16kHz)
  → WSS  /ws/stt                     backend/app/relay.py
  → Prisma v3.0 streaming             api.vachana.ai (indic-auto)
  → transcript                       {final only, ~100–180ms}
  → POST /api/command                backend/app/main.py
  → command_to_proposal()            backend/app/pipeline.py
       ├─ _reminder_or_stockout()    reminders, stock-out, summary,
       │                             delivery skip/month-bill
       ├─ parse_bill()               backend/app/bill_parse.py
       │   multi-item qty×unit×item×customer
       └─ bolta.parse()              vendored single-intent parser
  → proposal stashed in-memory (5-min TTL, no write yet)
  → UI confirm card + Timbre read-back   backend/app/tts.py
  → POST /api/confirm                payment_method: cash|upi|khata
  → ShopDB.record_bill()             backend/app/db.py
       itemized rows, stock movement (unit-aware g↔kg, ml↔l),
       paise arithmetic, confirm token for khata
  → customer opens /c/[token]        Confirm / Dispute → ledger state
```

## Key files

| File | Job |
|---|---|
| `backend/app/relay.py` | Authenticates + proxies browser audio to Prisma's WS. Verified header set (`x-api-key-id`, `lang_code`, `x-sample-rate`, `x-api-request-id`, `x-format`, optional `keyterms`, `multi_lang_codes`). |
| `backend/app/bill_parse.py` | Splits transcript on commas/`aur`, extracts qty+unit+item chunks, fuzzy-matches catalog, finds customer tail (`ke naam`, `के नाम`, `పేరు`). |
| `backend/app/pipeline.py` | Intent dispatch order: reminders/delivery → multi-item bill → vendored single intents (payment, stock, queries, undo). Stashes proposals; `confirm()` is the only write path. |
| `backend/app/db.py` | SQLite ledger. Integer paise everywhere. `transactions` + `txn_items` + stock movements + confirm tokens + reminders + subscriptions/delivery_skips. Idempotent writes. |
| `backend/app/tts.py` | Timbre REST with retry-on-reset; language→voice map (Poorvi `hi-en`, Suhana `te-IN`). |
| `frontend/app/lib/mic.ts` | getUserMedia → AudioWorklet → Float32→PCM16 @16 kHz → binary WS frames + `commit` on stop. |
| `frontend/app/page.tsx` | 5 tabs: counter (mic+confirm), ledger, stock, list (restock/reminders/deliveries), shop (join QR, summary). |
| `backend/app/vendor/` | `bolta` + `noiselab` vendored verbatim from NoiseLab — the hardened parser and its measured-benchmark companion. |

## Newer modules (post-P0)

| Module | Files | Notes |
|---|---|---|
| Customer accounts | `db.account_*`, `/api/me/*`, `frontend/app/m` | name+PIN, name-match join links to existing khata rows; multi-shop by design |
| Delivery billing | `subscriptions`, `delivery_skips`, `_delivery_intent` | month bill = days−skips; ambiguity asks, never guesses |
| Weekly insights | `db.weekly_insights`, `is hafte` intent | every figure computed from DB; Timbre speaks the template |
| Staff + leave | `staff`, `leave_requests`, `leave_events`, `require_owner` | assistant bills/stocks; undo/leave/settings owner-only server-side; dual-approval with audit |
| Business types | `biztypes.py`, `shop_config` | fixed module list, schema-validated; voice `dukaan type X` |
| Judge sandbox | `/api/try/*`, `frontend/app/try` | own DB, daily reset, 60/day/IP; stash carries its own db |
| Trust score | `db.trust_scores` | confirmed-share + payment-coverage; a pill, not a verdict |

## Per-person interview Q&A

**For Harshita (voice/core):** "Why keep the rules parser when you had
benchmark data showing where it fails?" — Because the benchmark told us
*where* the grammar was thin (Telenglish at 17%), not that rules were
wrong: the fix was coverage (Telugu units/aliases, romanized forms),
which is one line per rule and regression-tested. The bolta core is
vendored verbatim precisely so those measured behaviors survive.

**For Rohit (web/platform):** "What breaks first at scale?" — The
in-memory proposal stash and token maps (restart loses them — harmless:
they expire in 5 min/12 h anyway) and SQLite write contention at many
concurrent owners. `schema.sql` + the module boundaries are drawn so
Postgres is a swap, not a rewrite.

**For either:** "What would you delete first?" — The `/try` sandbox's
own DB → a real per-session ephemeral store; and the PIN scheme →
phone-OTP when a real SMS budget exists.

## Interview Q&A — "why rules and not an LLM?"

**Q: You have LLM keys. Why is extraction deterministic?**

Three reasons, in order of importance:

1. **Correctness envelope.** The grammar is tiny and closed: `qty × unit
   × item × customer × intent`. Everything the parser emits must resolve
   to a real catalog row with a real price — a generative model adds
   nothing except a chance to hallucinate a price or a customer that
   isn't in the khata. A parse that fails deterministically is *better*
   than a parse that succeeds wrongly, because the shopkeeper just
   repeats the phrase.
2. **Latency & cost.** The rules path is ~0 ms and 0 credits. The whole
   point of Prisma's ~100 ms streaming is a sub-second loop; adding an
   LLM round-trip would triple it for zero accuracy gain on this domain.
3. **Debuggability.** When Hinglish `"paanch sau"` collides with a ₹500
   product or `"do kilo"` vs `"dono kilo"`, we can point at the exact
   rule and fix it — the regression test is one line in
   `tests/test_app.py`. An LLM failure is a shrug.

**Q: Would an LLM ever be the right answer here?**

Yes — for the long tail: phrasings outside the grammar ("usko bata do
kal aake le jayega"), cross-sentence context, or open-ended summaries.
The right architecture is *rescue-only*: rules first, LLM only when the
rules path returns low confidence, output schema-validated against the
catalog, and it still lands on the same confirm card — never a direct
write. We deliberately didn't ship one because the judges asked for
genuine Gnani usage, and a Groq/Gemini call in the money path muddies
that story. The templates (reminder text, spoken summaries) cover the
phrasing need today.

**Q: Where does Gnani actually carry the product?**

Exactly where the hard problems are:

- **Prisma** — noisy, code-mixed, telephonic audio. `indic-auto` handles
  the mid-sentence Hindi→Telugu switch our single-locale parser could
  never see; ITN gives us digits; `keyterms` biases toward our catalog.
- **Timbre** — trust. The read-back ("do kilo cheeni, Ramesh ke naam,
  ₹174, sahi hai?") is the confirm step a low-literacy user actually
  relies on, and it must be in *their* language, not just the transcript.

Extraction being rules-based isn't a workaround for missing LLM access —
it's the same decision you'd make with unlimited access.

**Q: Two-sided confirmation — why?**

A kirana ledger is adversarial: the owner writes what the customer owes.
A `pending → confirmed|disputed` state machine with an unguessable token
link makes the ledger *agreed*, not just *asserted* — that's the product
difference from every "voice calculator" demo.

## Verified API quirks (worth knowing before judging)

- Streaming rejects comma-separated `language_code`; multi-locale needs
  `multi_lang_codes` — or just use `indic-auto`.
- No partial transcripts over the stream (finals only, ~100–180 ms).
- 60 s server-side idle timeout; relay reconnects.
- Full-size WAV uploads can trip a WAF 403; FLAC passes. We stream PCM
  so it doesn't apply.
- TTS edge occasionally resets connections — `tts.py` retries.
- `hi-en` is a valid TTS locale but the client-side SDK validator
  rejects it — we call REST directly.
