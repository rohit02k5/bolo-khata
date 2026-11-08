# UI Audit — Bolo Khata (before polish)

Screenshots: `docs/screens/before/` (390×844 and 360×800, DPR 2, Chrome mobile emulation).
Method: playwright-core + system Chrome; authenticated via injected localStorage tokens;
bill state captured through the `?say=` demo hook (kept — useful for filming without a mic).

## Global

| # | Severity | Finding |
|---|----------|---------|
| G1 | high | Theme is a cold dark-navy "SaaS dashboard". Nothing warm, paper, or neighbourhood about it. No light theme at all. |
| G2 | high | No design tokens — colours hardcoded per rule (`#22c55e`, `#38bdf8`, hex literals inline in tsx). Dark-mode-only palette baked in. |
| G3 | high | No bottom tab bar; tabs are floating ovals near the top — primary nav is *outside* the thumb zone. Selected style = blue pill, no icon+label consistency (emoji render varies by platform — 📒 rendered as plain yellow square in shots). |
| G4 | high | Primary action (mic) sits mid-screen inside a plain card, not in the lower-half thumb zone. 96px target OK but no visual state system (listening / thinking / speaking look identical). |
| G5 | high | System font stack only — Devanagari/Telugu get fallback rendering, no tuned line-height (1.5+), no guaranteed glyph coverage, no tabular numerals for money. |
| G6 | med | Buttons ~44-48px but ghost buttons have thin borders and low contrast; "Khata" is amber while "Cash/UPI" are green — colour semantics inconsistent with the status system (amber already means *pending*). |
| G7 | med | Loading states are bare text (`loading…`); no skeletons. Empty states are `none` / `empty` — no guidance. |
| G8 | med | No focus-visible styles, no aria-labels on icon-only buttons (mic, ✔ ticks, ⏹). No `prefers-reduced-motion` handling (no animations exist to reduce — but the polish will add them). |
| G9 | med | No PWA manifest/icons/theme-color; `main` has no safe-area padding; overscroll/bounce untested. |
| G10 | low | Toast exists but is bottom-fixed over content; no haptics; no error microcopy pass (some raw `e.message` leaks: "STT: …", "Mic failed: …", "Parse failed: …"). |

## Per screen (screenshots referenced)

**Login (`390-login.png`)** — cramped rows, label sits inline with input, no brand mark, no language choice at entry. Looks like a settings page, not a front door.

**Counter (`390-counter.png`)** — giant dead space: mic card occupies the middle with "Tap to speak" and nothing else; Undo/Refresh float above the fold while the real action is hidden in a card. No waveform, no transcript placeholder affordance, no latency strip until after a run.

**Bill card (`390-bill.png`)** — strongest screen already, but: plain table not a receipt; no serial column styling; spoken read-back text small; three equal green-ish CTAs read as one blob; "Nahi" is a stray fourth button; parse-conf chip good but `add_bill` internal intent name leaks into UI; no item animation; Khata uses amber = visually reads "risky", should read "ledger/book".

**Khata/ledger (`390-ledger.png` shows counter — click missed, layout reviewed in code)** — rows are text-text; no avatars, balance not visually dominant; "Aaj ka hisaab" nested card looks like an error banner; pills exist but tiny; no search.

**Stock (`390-stock.png`)** — endless flat list of identical rows; reorder warning is plain text ("Doodh · 1.8d left — order 37 packet"), not a visual badge; no stock-level bar; emoji fall back to 🛒 for half the catalog (🛒🛒🛒 repetition).

**List (`390-list.png`)** — sections stacked with faint `.dim` headers; voice-reminder done-tick is a giant empty ghost button; delivery rows mix units in prose; weekly card reads as raw rows; empty state copy is good but tiny.

**Shop (`390-shop.png`)** — business type is a bare `<select>`; join QR block is fine but the link box is low-contrast; "On: ledger · stock …" module list is unstyled prose; UPI VPA shows "—" (empty state not designed). `localhost:3000` join URL in screenshot is dev-only (public URL at deploy).

**Confirm `/c/` (`390-confirm.png`)** — clean but cold; amount strong; no receipt feel, no item emoji, Confirm/Dispute mid-screen not sticky bottom; no "Powered by Gnani AI" mark; note text small and dim.

**Reminder `/r/` (`390-reminder.png`)** — duplicate controls: native `<audio controls>` AND a "▶ Play" button — pick one; native player is light-grey on dark and ugly; no waveform; good copy.

**Customer app `/m/` (`390-custapp.png`)** — lots of empty vertical space; balance inside a header row not a hero number; tabs are pills; "koi pending confirm nahi" empty state is bare.

**Sandbox `/try/` (`390-try.png`)** — good content; banner border is thin amber on navy (contrast ok); example commands are bullet prose, should be tappable chips; no header explaining what a judge is looking at in one line.

**About (`390-about.png`)** — solid copy but walls of text; no hero-flow *diagram*; no origin/IIT Bhilai visual anchor; bottom of page cut mid-sentence in shot (scroll fine); "Evon v3.3 … deliberately unused" is honest — keep, restyle.

**Benchmark** — data-dense table page; acceptable but needs section headers + honest-failures callout styling.

## Motion/accessibility gaps
- Zero animation today (nothing to reduce): bill items should animate in; confirm gets a check-draw; press feedback spring; skeletons instead of "loading…".
- No `lang` attribute switching on Telugu/Devanagari content; no `aria-label`s; tap targets mostly OK but icon buttons are ~40px.
- No dark/light split — new system must ship both (dark suited to evening shops).

## Verdict
Functional but reads as "generic dark admin". Rebuild the visual layer around a warm paper ledger metaphor, bottom tab bar, receipt bill card, and a real mic-state system — without touching behaviour.

---

# Fix log — what changed (after: `docs/screens/polish-final/`)

- [x] G1/G2 full token system: light warm-paper theme + warm-charcoal dark theme (system-aware + 🌙 toggle, `bk_theme`, zero-flash boot script)
- [x] G3 bottom tab bar (thumb zone, icon+label, blur backdrop, safe-area)
- [x] G4 mic hero: 128px button, ring-pulse while listening, real-RMS waveform (`onLevel` from the worklet), thinking/speaking states, `.compact` mode so the receipt + CTAs stay in frame + auto-scroll
- [x] G5 Noto Sans + Devanagari + Telugu via next/font (self-hosted); tabular-nums money; `lang=te` line-height 1.6
- [x] G6 button semantics: `.ok`=paid/confirmed green, `.primary`=teal, `.danger`=dispute red, `.warn`=pending amber only
- [x] G7 skeleton loaders on `/c/` `/r/` `/m` stock/shop; designed empty states with emoji + guidance
- [x] G8 aria-labels on all icon-only buttons, `aria-live` transcript, `role=dialog` sheet, focus-visible ring, reduced-motion collapse
- [x] G9 PWA: manifest, SVG icon, standalone display, theme-color both schemes, safe-area insets, no pinch-zoom, overscroll locked
- [x] G10 error microcopy pass: micFail/parseFail/silence human strings per lang; haptics via navigator.vibrate
- [x] Bill card → `.receipt` (torn edge, serial column, staggered slide-in, ₹/kg unit-price display, customer chip, spoken line, "Abhi paid → sheet" + "Khata me likho" huge CTAs)
- [x] UPI → bottom `.sheet` with QR, amount hero, self-reported note
- [x] Khata → avatar initials, `.bal` colour semantics (owe red / paid green), trust chips, text search, summary hero
- [x] Stock → `.stockbar` fill bars + low-stock red pills + reorder warning card
- [x] List → checkbox-style done buttons, delivery month calendar (delivered/skip/future), weekly card
- [x] `/c/` → receipt look, hero amount, sticky Confirm/Dispute, check-draw on confirm, skeleton, Powered-by footer
- [x] `/r/` → custom `.player` waveform (progress from real `timeupdate`), no duplicate controls, Powered-by footer
- [x] `/m` → wallet-style shop cards with hero balance, timeline hisaab, CSS bar chart (pattern-safe for colour-blind)
- [x] `/try` → tappable sample chips, receipt result card, human errors
- [x] `/about` → 6-step flow diagram, model-credit pills, IIT Bhilai, Powered-by footer
- [x] `/benchmark` → condition bars colour-coded, live-check list, honesty notes
- [x] `/join` → friendly form, check-draw success, Powered-by footer
- [x] Login → brand hero, language-first choice, Owner/Staff toggle
- [x] Docs: DESIGN_SYSTEM.md, DECISIONS #16–22, CODE_TOUR UI section, TELUGU_REVIEW chrome strings

## Deliberately NOT done (documented)
- Qty tap-edit on bill items — needs a reprice API (confirm writes a server-side stash); DECISIONS #19
- Tap-to-skip on delivery calendar — `add_skips` is voice-path only; adding a route = API change, forbidden by the task; DECISIONS #20
- Icon/motion library — emoji + inline SVG + CSS only; DECISIONS #18
- Onboarding wizard — covered as language-first login + illustrated business-type chips in the Shop tab; a separate wizard needs backend state

