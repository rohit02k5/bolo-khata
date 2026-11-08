# Design system — Bolo Khata v2

Feeling: a calm, trustworthy shop counter — closer to Google Pay's clarity
than a SaaS dashboard. One focal point per screen, tonal surfaces instead
of bordered boxes, a real type scale, one icon language.

Every value lives as a CSS custom property in `frontend/app/globals.css`.
Never hardcode a hex in a component.

## Principles (enforced in UI_REVIEW.md)

1. One focal point per screen; everything else recedes.
2. Max 2 container levels. Hairline dividers + whitespace beat borders.
3. Three elevations: base → `.surface` (--e1) → `.sheet` (--e3).
4. Type leads: display 40–48 / title 24 / body 16 / caption 13.
   Weights 400/600/800 only.
5. One icon language: `lib/icons.tsx` — inline SVG, 24px grid, 2px
   stroke, round caps. Emoji only for product items in bills/stock.
6. One brand teal + ONE warm accent (the mic / listening state).
   Semantic colours only for status, always paired with a dot/label.
7. 8px grid · 20px screen margins · 24px section gaps · radius 12/20/28.

## Tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#faf6ef` warm paper | `#14100d` warm charcoal | page |
| `--s1` | `#ffffff` | `#211a14` | raised surface (`.surface`, sheets) |
| `--s2` | `#f3eee3` | `#2a211a` | tonal recess (inputs, tonal surface) |
| `--ink` / `--ink2` / `--dim` | `#1c1610` / `#54493c` / `#8a7d6c` | `#f2ebe1` / `#c2b4a2` / `#94867a` | text ramp |
| `--line` | `rgba(60,45,25,.10)` | `rgba(240,225,200,.11)` | hairlines only |
| `--primary` / `--primary-2` | `#0d5f52` / `#12806f` | `#37b3a0` / `#2a8f80` | brand; gradient = 160deg `--primary-2 → --primary` |
| `--accent` / `--accent-2` | `#e07a2f` / `#ef9a52` | `#f0914a` / `#d97c30` | THE action: active mic, listening ring, active-tab dot |
| `--ok` / `--warn` / `--bad` / `--info` | semantic set + `*-soft` tints | | status only, always with dot or label |
| `--e1` / `--e2` / `--e3` | soft large-radius shadows | darker variants | raised / button / overlay |
| `--r-s` / `--r-m` / `--r-l` | 12 / 20 / 28px | | controls / surfaces / sheet |
| `--ease` | `cubic-bezier(.32,.72,.35,1)` | | default |
| `--spring` | `cubic-bezier(.34,1.4,.44,1)` | | press feedback |
| `--tabbar-h` | 64px | | bottom bar + safe-area |

## Typography

Noto Sans + Noto Sans Devanagari + Noto Sans Telugu, self-hosted via
`next/font`. Body ≥16px, line-height 1.55 (1.62 `lang=te`).
`.display` = clamp(38px,11vw,46px) 800 for hero amounts; `.title` = 24;
`.hero-num` retained for mid-size money. All numerals tabular; `inr()`
for Indian grouping. Dates as "8 Nov 2026, 12:40 pm" (`fmtDate`).

## Components (class = contract)

- `.topbar` — one row: `.wordmark` | `.seg` (language) | `.menu` (⋮
  overflow: theme, undo, refresh, sign-out).
- `.stage` — counter hero; `.compact` when a sheet is up. `.big-mic`
  112px gradient + `.glow-ring` idle-breathe + `.level-ring` scaled by
  real RMS + `.wave` bars (also real RMS). Listening flips to `--accent`.
- `.sheet` + `.sheet-back` + `.grab` — bill, pay-method, and result are
  all bottom sheets over a dimmed counter; `.sheet-foot` sticky actions.
- `.bill-rows` / `.bill-row` — hairline item rows (emoji · name ·
  muted qty×price · right-aligned amount), stagger 40ms.
- `.bill-total` — display-size amount.
- `.pay-row` — large selectable rows (Cash/UPI) with icons; `.qr-tile`.
- `.avatar`, `.dot-st` — initials + 8px status dots (not text pills).
- `.list .entry` — hairline row lists; `.tabbar` — 5 line-icon tabs,
  active = teal + 4px accent dot.
- `.surface` / `.surface.tonal` — the only two card levels.
- `.tickbox` — 48px checklist control with tick icon.
- `.cal .d` — delivery month grid (delivered=soft ok, skip=soft bad,
  future=plain).
- `.player` — voice-note player: round play btn + waveform progress
  (real `timeupdate`) + elapsed.
- `.skeleton`, `.empty-state`, `.toast`, `.offline-bar`, `.banner`.
- `.seg` — segmented control reused for language, login mode, app tabs.

## Motion

transform + opacity only · 150–350ms · `--ease`; `--spring` on presses.
`sheet-up` + backdrop `fade-in`; `row-in` stagger; `check-draw`;
`breathe` glow; `shimmer` skeletons; `morph-ok`/`celebrate` micro-moment.
`prefers-reduced-motion` collapses everything to ~1ms.
`navigator.vibrate(8/25/40)` on mic-start / write / error.
No motion library — CSS + a few lines of JS only.

## Demo notes

`?say=<transcript>` hooks a command in without a mic (filming/judges).
Debug latency + parse-conf live inside the collapsed `Details` strip and
the bill-sheet caption — never as floating debug chrome.
