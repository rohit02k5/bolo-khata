# Demo script (~90 s, two phones)

**Setup before filming:** owner phone = app + logged in; customer phone =
second phone, WhatsApp/browser ready. Backend warm (see
FINAL_CHECKLIST.md wake-up). Room ambient shop noise is *good* — that's
the point.

## 0:00–0:10 — Frame

"India runs on kirana udhaar — spoken, remembered, argued about. Bolo
Khata turns that speech into a trusted ledger."

## 0:10–0:35 — Hero bill (owner phone)

1. Hold mic. Say, at normal counter volume:
   **"2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"**
2. Point at: live transcript → itemized card (sr / item / qty / price /
   ₹174) → Timbre reads it back in Hinglish.
3. Tap **Khata**. Note stock ticks down.

## 0:35–0:55 — Two-sided trust (customer phone)

4. "Ramesh gets a link on his phone." Open `/c/[token]` on the second
   phone — shows the exact same bill.
5. Tap **Confirm**. Cut back to owner phone: entry flips
   pending → confirmed, balance updates.
   *(Alt take: tap Dispute → show disputed state + undo.)*

## 0:55–1:15 — Breadth (owner phone, rapid-fire)

6. **"chini kitni bachi hai"** → spoken answer.
7. **"Ramesh ka doodh kal se 2 din nahi chahiye"** → confirm →
   **"dudh ka bill"** → month bill adjusts live.
8. **"Ramesh ko yaad dilao"** → voice-note link → play the Timbre audio
   on the customer phone.
9. **"galat, wapas"** → undo reverses the last write; stock restored.

## 1:15–1:30 — Close

10. Switch to `/benchmark`: "1,008 real Prisma jobs measured — 88%
    action-success clean, 87% on telephony audio. And the whole
    understanding layer is rules — because near money, deterministic is
    a feature." Name the models: **Prisma + Timbre**.

## Fallbacks

- If live STT hiccups: same commands are in `commands.json`; the Streamlit
  fallback in `NoiseLab/` reproduces the ledger demo offline.
- If TTS stalls: tap the speaker icon again — `tts.py` retries; worst
  case, read the card aloud and continue.
- If the tunnel/host dies mid-take: restart per FINAL_CHECKLIST and
  resume from step 4 — ledger state persists in SQLite.
