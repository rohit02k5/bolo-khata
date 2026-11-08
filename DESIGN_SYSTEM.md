# Design system — Bolo Khata

Feeling: a well-kept shop counter. Warm paper, deep-teal ink, big type,
one thumb. Every value below lives as a CSS custom property in
`frontend/app/globals.css` — never hardcode a hex in a component.

## Tokens

| Token | Light | Dark (`data-theme="dark"` or system) | Use |
|---|---|---|---|
| `--bg` | `#fbf7f0` warm paper | `#171210` warm charcoal | page |
| `--card` / `--card2` | `#fffdf8` / `#f4ede1` | `#221b16` / `#2c241d` | surfaces |
| `--ink` / `--dim` | `#1d1611` / `#6f6153` | `#f2eae0` / `#ab9c8b` | text |
| `--primary` | `#0d5f52` teal | `#2fbfae` | brand, primary actions |
| `--ok` | `#1a7f3b` | `#4ecb71` | paid / confirmed — always with icon+label |
| `--warn` | `#b45309` | `#e8a04c` | pending |
| `--bad` | `#b3261e` | `#ef6c63` | disputed / low stock |
| `--info` | `#1d4ed8` | `#7da6ff` | info chips |
| `*-soft` variants | tint backgrounds | | pills, banners, avatars |
| `--ease` | `cubic-bezier(.34,1.35,.44,1)` | | spring press |
| `--dur` | `0.22s` | | default duration (150–300ms range) |
| `--tabbar-h` | `68px` | | bottom tab bar |

Motion rules: transform + opacity only; `card-in`, `slide-in`, `sheet-up`,
`ring-pulse`, `check-draw`, `shimmer`; `prefers-reduced-motion` collapses
everything to 1ms. `navigator.vibrate(8/25/40)` on mic-start / write / error.

## Typography

Noto Sans (latin) + Noto Sans Devanagari + Noto Sans Telugu, self-hosted
via `next/font`. Body ≥16px, line-height 1.55 (1.6 for `lang=te`).
Money uses `font-variant-numeric: tabular-nums`; amounts 28–40px via
`.hero-num`. Rupee formatting goes through `inr()` (en-IN grouping).

## Components (class names are the contract)

- `.card` — 18px radius, border + soft shadow, `card-in` entrance.
- `.receipt` — the bill/confirm "paper slip": rounded top, torn zig-zag
  bottom edge (`::after` gradients), dashed row separators, `.sr` serial
  column, `tr.slide-in` staggered item entrance.
- `.tabbar` — fixed bottom nav, blur backdrop, safe-area padded; each
  tab is icon + 11.5px label, ≥60px tall.
- `.mic-stage` / `.mic-orbit` / `.big-mic` / `.mic-ring` / `.wave .bar` —
  mic hero. `.listening` toggles ring-pulse + red state; `.compact`
  shrinks the stage so a proposal keeps its CTAs in frame.
- `.pill.<state>` — pending/confirmed/disputed/info; icon+tint, never
  colour alone.
- `.sheet` + `.sheet-back` — bottom sheet (UPI payment).
- `.avatar` — 42px initials chip for customer rows.
- `.stockbar` — stock fill bar; `.low` turns it red.
- `.cal` — 7-col delivery month grid; `.d.skip` / `.d.future`.
- `.player` + `.waveform i` — voice-note player; `i.played` fills with
  real `timeupdate` progress.
- `.banner` — 2px-bordered notice (demo data, errors).
- `.skeleton` — shimmer loader (replaces all `loading…` text).
- `.empty-state`, `.toast`, `.confirm-link`, `.check-draw`, `.celebrate`,
  `.flow-step`/`.flow-arrow`, `.chip`, `.powered`, `.offline-bar`.

## Layout contract

`main` max-width 480px, bottom padding = tabbar + safe-area; pages
without nav add `.no-tabbar`. Tap targets ≥48px. Primary actions live in
the thumb zone (lower half / bottom sheet / bottom tab bar).

## Language

All chrome strings live in the `T` dict at the top of `app/page.tsx`
(`hinglish` / `te` / `en`). New Telugu strings must also be pasted into
`TELUGU_REVIEW.md` for Rohit's ear review. Voice read-back text must
match on-screen text (both come from the same `spoken` field).

## What the UI must never do

- Claim ASR confidence — the chip says "parse conf".
- Imply UPI verification — always "self-reported".
- Use a Gnani logo or imply endorsement beyond
  "Powered by Gnani AI · Prisma + Timbre".
- Show raw error text (`e.message`) — use the `T.*Fail` strings.
