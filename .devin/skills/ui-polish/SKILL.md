---
name: ui-polish
description: Apply Bolo Khata's design system when building or improving any UI — pages, sheets, lists, forms, charts. Use whenever the task touches frontend/app/** visuals, layout, components, or styling.
---

# UI polish — Bolo Khata design system

The source of truth is `DESIGN_SYSTEM.md` (repo root) and the tokens in
`frontend/app/globals.css`. Read both before styling anything. This file
is the checklist; the docs are the spec.

## Non-negotiables

- **Tokens only.** Never hardcode hex/radius/shadow values in components.
  Use `var(--primary)`, `var(--s1)`, `var(--s2)`, `var(--ink)`, `var(--ink2)`,
  `var(--dim)`, `var(--line)`, `var(--e1..e3)`, `var(--r-s/m/l)`,
  `var(--ok/warn/bad/info)` + their `*-soft` tints, `var(--ease)`,
  `var(--spring)`. New tokens go in `globals.css`, not inline.
- **One icon language.** `frontend/app/lib/icons.tsx` — 24px grid, 2px
  stroke, round caps. Emoji only for product items. Brand logos
  (Google/Discord) are the filled-SVG exception already in that file.
- **One focal point per screen.** Secondary content recedes (`--dim`,
  `--ink2`). Max two container levels: `.surface` then `.sheet`.
- **Touch targets ≥ 44px.** Inputs/selects/buttons use the global
  `input, select` rule (52px) unless a compact variant is justified.
- **i18n.** Every user-facing string goes through `pick(lang, S.*)` or
  the `t` dict in `app/app/page.tsx`. Add hi/te/en together — never
  English-only. Telugu needs the looser line-height (1.62).
- **Sheets, not modals.** New flows use `.sheet` + `.sheet-back` +
  `.grab` + `.sheet-foot` (see `LineEditSheet`, `ProductEditSheet`).
- **Lists.** `.list .entry` hairline rows; status via `.dot-st` dots or
  `.pill`, never color alone. Money via `inr()` (Indian grouping).
- **States.** Always cover: loading (`…`/skeleton), empty
  (`.empty-state`), error (`.banner` with `--bad-soft`), offline
  (`.offline-bar`), busy/disabled.
- **Motion.** transform+opacity, 150–350ms `var(--ease)`,
  `prefers-reduced-motion` respected. No layout-thrashing animations.

## Conventions in this codebase

- App shell is one big client page: `frontend/app/app/page.tsx`
  (~1900 lines). Panels/sheets are functions in the same file
  (`LedgerPanel`, `StockPanel`, `RemindersPanel`, `*Sheet`). Follow that
  pattern; don't introduce a new component library.
- Compact one-off pages live at `frontend/app/<route>/page.tsx`
  (`"use client"`, `flow-page` wrapper, `.topbar` + language `.seg`).
- API client: `frontend/app/lib/api.ts` — add methods there, typed
  loosely (`any` is the file's existing style; tsc must stay clean).
- Category/grouping chips: `.chip-row` + `.chip(.sel)` in globals.css.
- Selection mode: `.selbox` / `.entry.sel` (see onboarding rate list).

## Verify before done

1. `cd frontend && npx tsc --noEmit` — must pass.
2. `npx eslint <changed files>` — fix NEW errors you introduce
   (`no-explicit-any` and `no-img-element` are pre-existing noise;
   match surrounding style, don't mass-fix).
3. Check light AND dark (`bk_theme` localStorage / topbar toggle) —
   every color must come from tokens so both themes work.
4. Test at mobile width (~390px) — this is a phone-first app.
