# UI_REVIEW — design-v2 self-score

Scored 1–5 per screen before showing. Anything below 4 was fixed
before screenshots were taken. Verified on the production build
(`next start`), 390×844, light + dark, Hinglish + Telugu.

| Screen | Focal | Boxes | Hierarchy | Rhythm | Icons | Colour | Align | States | Telugu | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Counter (idle) | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | One focal mic; calm canvas. States exercised live: listening ring+wave are real-RMS; thinking/speaking verified earlier. |
| Bill sheet | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | Stacked-sheet pay flow; items stagger 40ms; read-back with speaker icon. Telugu strings reviewed in TELUGU_REVIEW. |
| UPI sheet | 5 | 4 | 5 | 4 | 5 | 5 | 5 | 4 | 4 | Cash/UPI rows with icons; QR on white tile; self-reported note quiet. |
| Confirm `/c/` | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | Display amount, hairline rows, quiet dispute link, check-draw on confirm. (Raw English "Galat hai" text by design — Hinglish is the shared page default.) |
| Voice note `/r/` | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | Real-progress waveform, elapsed timer, amount hero absent when 0. |
| Khata list | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | Gradient summary hero; dots not pills for status; search input. |
| Stock | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 5 | Slim bars, red qty text only when low; reorder card de-chipped. |
| List / deliveries | 4 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | Month grid with dots; voice-only skip noted honestly. |
| Shop tab | 4 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 | Business-type chips keep product emoji (allowed); QR on white tile. |
| Customer app `/m` | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | Wallet-style hero balance, segmented tabs, timeline, bar chart. |
| /try | 4 | 4 | 5 | 4 | 5 | 5 | 5 | 4 | 5 | Sample chips are content, not chrome. |
| /about | 4 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | — | Emoji only inside flow steps (content). Static page — no interactive states to grade. |
| /benchmark | 4 | 4 | 4 | 4 | 4 | 5 | 4 | — | — | Colour-coded bars; honest fail marks. Static page. |
| Login | 4 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 4 | Language seg first, single surface, brand mic mark. |

## Fixed during the pass (would-have-been-4s)
- Next dev "N" badge → production build only; stale dev server killed.
- "Details · Details" doubled label.
- Topbar overflow pushing the ⋮ menu off-screen (seg/wordmark tightened).
- Confirm-page item names center-aligning (inherited `text-align`).
- `credit_sale` raw key → readable "credit sale".
- Reorder rows un-flexed ("1.8d leftorder 37 packet" run-on).
- Emoji stripped from all chrome (buttons, tab bar, heads); one SVG line
  icon set (2px stroke, 24px grid) everywhere; product emoji stay.

## Known honest limits
- No qty-tap-edit (needs a reprice API) — DECISIONS #19.
- Delivery skip stays voice-only — no new REST route (API freeze).
- Listening-state waveform/RMS verified via `onLevel` code path; the
  screenshot pass can't inject real mic audio — video shows the
  bill-sheet + confirm transitions live.
- `?say=` demo hook remains (filming aid) — hidden behind the same
  visual system, no debug chrome visible.
