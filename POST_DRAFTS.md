# Post drafts — public announcement (~6 PM Nov 9)

## LinkedIn / long form

**Bolo Khata — a voice-first ledger for India's neighbourhood shops.**

60 million kiranas run on spoken credit — "likh dena" — remembered on
both sides and argued about at month-end. We asked: what if the ledger
itself understood the shopkeeper's voice, in Hinglish or Telugu, over
counter noise, and both sides could confirm it?

The demo: the owner says *"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh
ke naam"* — a bill appears (₹174), is read back aloud in his language,
and only then writes. Cash, UPI, or Khata. If khata, Ramesh gets a link
on his own phone: Confirm or Dispute. The ledger isn't settled until
both sides say so.

It also does the boring-beautiful parts: stock that deducts 0.5 kg when
you say "500 gram", restock checklists, voice-note payment reminders
sent as audio links, month-end milk bills that subtract skip days —
"kal se 2 din dudh nahi chahiye".

Under the hood: **Gnani Prisma** streams the speech — code-mixed,
noisy, mid-sentence language switches handled by `indic-auto` —
and **Gnani Timbre** speaks the confirmations back. The understanding
layer is deliberately deterministic rules: near money, a parser that
fails loudly beats a model that guesses confidently. Every number on
our /benchmark page is a real measurement — 1,008 STT jobs, telephony
degradation included, failures shown.

Built for the Gnani AI Internship Challenge. Repo + demo link in
comments. Feedback welcome — especially from anyone who's kept a real
khata.

## X/Twitter (short)

Voice-first kirana ledger: say "2 kilo cheeni, 1 Maggi, Ramesh ke naam"
→ bill → spoken read-back → customer confirms on their own phone.
Prisma for ears, Timbre for voice, rules for the math — deterministic
near money on purpose. [video] [repo]

## Reply ammo (anticipated comments)

- *"Why not an LLM?"* — CODE_TOUR.md has the full answer; short version:
  closed grammar + real catalog prices + confirm card = rules win on
  correctness, latency and cost. LLM belongs in the rescue slot only.
- *"How is the customer confirm done?"* — unguessable token link scoped
  to exactly one ledger row; pending→confirmed/disputed state machine.
- *"Does it handle Telugu?"* — yes: `indic-auto` STT + Suhana TTS voice;
  romanized-Telugu input ("rendu kilo panchadara") also parses.
- *"Is the UPI real money?"* — it's a self-reported `upi://` deep link
  QR; we never claim verified payment. Honest by design.
