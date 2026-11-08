# Post drafts — public announcement (~6 PM Nov 9)

Tag: **Gnani AI** · `#GreatIndianAIInternshipChallenge` `#GnaniAI`

## LinkedIn — main post (story-first)

The kirana shop near our hostel in Durg-Bhilai runs on a notebook.
"Do kilo cheeni, ek Maggi — Ramesh ke naam." The owner writes it from
memory; Ramesh trusts it's right. At month-end, they negotiate.

We built **Bolo Khata** — the ledger that just listens.

The owner says the same sentence out loud. Our app transcribes it live
(Gnani **Prisma** streaming — it handles Hinglish, Telugu, even
mid-sentence language switches over shop noise), turns it into an
itemized bill, and **speaks the total back** (Gnani **Timbre**) before
writing a single paisa. Then the part we're proudest of: Ramesh gets a
link on his own phone — **Confirm or Dispute**. The ledger isn't
settled until both sides say so.

It also deducts 500 grams correctly from a kg-stocked daal, reminds
Ramesh with a voice note he can play, and bills the milk subscription
only for days actually delivered — "kal se 2 din dudh nahi chahiye."

One deliberate choice: no LLM writes the ledger. Extraction is
deterministic rules — closed grammar, real catalog prices, a human
confirm card on every write. Near money, a parser that fails loudly
beats a model that guesses confidently. Every number on our /benchmark
page is a real measurement — 1,008 speech jobs, telephony degradation
included, failures shown.

Two students, IIT Bhilai. Demo video + repo in comments. If you've ever
kept a real khata, tell us what we got wrong. 🙏

#GreatIndianAIInternshipChallenge #GnaniAI

## X/Twitter

Voice-first kirana ledger: "2 kilo cheeni, 1 Maggi, Ramesh ke naam" →
bill → spoken read-back → customer confirms on their own phone.
Prisma listens, Timbre speaks, rules do the math — deterministic near
money on purpose. @gnani_ai #GreatIndianAIInternshipChallenge [video]

## Follow-up post (Nov 10–11, if engagement)

The comment we expected: "why not just use an LLM?" Fair question —
here's the honest answer. The ledger grammar is closed (qty × unit ×
item × customer). Every token must resolve to a real catalog row with
a real price. An LLM adds only two things there: latency and a
hallucination surface. Where generation *would* help — phrasing,
long-tail phrasings — we used templates, and left the door open as a
schema-validated rescue path behind the same confirm card. Rules
first, always, for money.

## Comment-reply bank

- *"Cool, but can it handle Telugu?"* — Yes: indic-auto STT + a Telugu
  voice (Suhana). Romanized Telugu parses too. There's a Telugu demo
  segment in the longer cut.
- *"How does the customer confirm?"* — Unguessable token link scoped
  to one ledger row; pending→confirmed/disputed. No install needed —
  and if they join via the shop's QR with a PIN, they get their full
  khata in /m.
- *"Is UPI real money?"* — It's a `upi://` deep-link QR, honestly
  labeled self-reported. Gateway verification is on the roadmap.
- *"Benchmarks real?"* — 1,008 jobs against the live API with
  simulated telephony degradation, cached so nothing is paid twice,
  failures published. New recorded set coming — methodology's in the
  repo.
- *"What about staff?"* — Assistants can bill/stock but not undo or
  settings; leave needs owner-mark + staff-confirm (dual approval,
  audited).
- *"Privacy?"* — Raw mic audio never stored; names + PINs only;
  synthetic demo data; DPDP-aware notes in the repo.
