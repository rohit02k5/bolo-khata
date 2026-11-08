# FLOW_MAP — product-v1 audit (2026-11-08)

Routes as they exist **before** this pass, who can reach them, what a
brand-new visitor sees, and where each step breaks.

## Route inventory

| Route | Auth | What a new visitor sees | Break |
|-------|------|-------------------------|-------|
| `/` | none→login | **A login form.** No explanation of the product, no signup, no role choice. A judge landing cold sees a bare email+password box. | **No landing page, no signup, no "customer or shopkeeper?"** |
| `/m` | customer token | Customer app. If no token: name+PIN box with zero context — no signup path, no "join a shop" prompt. | Dead end for a new customer; PIN model only (no email option). |
| `/join/[code]` | none | Shop name + name/phone/(optional PIN) form. Works, but a logged-out customer with no account gets an anonymous khata they can never reopen. | No guided "signup then join" flow; no camera scan (type-only is fine, code is printed under the QR). |
| `/c/[token]` | none | Public confirm page. Receipt + Confirm/Dispute + Hinglish/Telugu. | OK — keep as is. |
| `/r/[token]` | none | Voice-note player page. | OK — keep as is. |
| `/try` | none | Judge sandbox: type a phrase, see parse+confirm on synthetic data. | OK — keep. |
| `/about` | none | Story page. | OK — polish only. |
| `/benchmark` | none | Honest benchmark tables. | OK — keep. |
| `/app` | — | **Does not exist.** The app IS `/`. | Missing route — logged-in landing target. |
| `/start` | — | Does not exist. | Missing — role choice. |
| `/login`, `/signup` | — | Do not exist; login lives inside `/`. | Missing. |
| `/onboarding` | — | Does not exist. Business type is buried in Dukaan tab → "change type". | **Business type never asked at the start** — the single biggest onboarding gap. Milk/newspaper shops land on a kirana tab bar. |

## In-app breaks (post-login)

| Step | Current behaviour | Break |
|------|-------------------|-------|
| Mic | Tap starts `VoiceSession`; stops only on second tap (with a 1.2 s commit flush). | **Keeps listening after the bill sheet appears** — tab recording indicator stays on while sheets/dialogs are open. No auto-stop on final transcript, no 20 s cap, no stop on tab-hide/logout/route change. |
| Transcript | Read-only text. | Can't fix a bad word; must cancel and re-speak. |
| Bill sheet | Static rows + Khata/Paid buttons. | **Nothing editable** — wrong qty/item/customer = cancel + re-speak. `unresolved` renders as a raw debug string. |
| Unknown item | `unresolved: ["cheeni patti"]` shown as grey text. | **No ask-back.** Item is dropped from the bill silently on confirm — the owner may not notice. |
| Ambiguous item | `items[].options`/`customer_options` returned but never rendered. | Same silent-guess problem. |
| Unknown customer | `customer:{name}` in unresolved; khata button disabled (customer_id null). | No one-tap "add Ramesh" — stuck unless customer pre-exists. |
| Business type | Set once via `/api/shop/config`, picker at top of Dukaan QR screen. | Asked too late; tab bar is fixed 5 tabs regardless of type. |
| Multi-shop | `SHOP_ID = 1` hardcoded through `db.py`; tokens carry only an actor string. | **A second owner can never exist.** Real signup requires per-shop scoping. `join()` even writes customers to shop 1 regardless of the scanned shop's id — latent bug. |
| Accounts | Owner = one seeded `.env` login; staff = name+PIN; customer = name+PIN. | No signup for anyone; no password rules; no forgot path. |
| Demo hook | `?say=` always on, unlabelled. | Must be env-gated + labelled "scripted test". |

## Target flow (what this pass builds)

```
/                    landing (public; logged-in → /app)
└─ /start            language picker (first visit) → role choice
   ├─ owner      → /signup → /onboarding → /app  (+coach marks)
   ├─ assistant  → /login?mode=staff (or invite-code signup) → /app
   └─ customer   → /signup?role=customer → join shop (code/QR) → /m
/join/[code]         public: shop card → signup-inline → joined → /m
/app                 the product; tab bar per business type
/m                   customer multi-shop khata
/c/[token] /r/[token] /try /about /benchmark   (unchanged)
```

Backend gaps to close: `users` table + signup/login, `POST /api/shop/setup`
(shop + business type + starter catalog), staff invite code, customer
signup with contact, `POST /api/bill/edit` (re-stash edited bill),
`POST /api/products` (quick-add), `POST /api/customers` (quick-add),
multi-shop `ShopDB(shop_id)` + per-actor db resolution.

---

## After state (product-v1, verified 2026-11-08)

Every break above is closed:

| Break | Fix | Verified |
|-------|-----|----------|
| No landing | `/` = public landing (Hinglish hero + te/en toggle, recorded-demo loop, 3-step "kaise kaam karta hai", problem/trust strips, business-type row, footer). Logged-in → `/app`. | Playwright `pv1.js`: title renders fresh-profile |
| No role choice | `/start` = language-first (big visual cards, saved to `bk_lang`), then two role cards. `?role=` deep-links honoured. | `pv1.js` journey |
| No signup | `/signup` = owner email+password (rules, show/hide, errors) + customer name+PIN+contact+optional shop code. `/login` = owner/staff/demo. | `pv1.js` + backend tests |
| Business type late | `/onboarding` = 5 steps (details → type cards → UPI skip → starter-catalog preview → QR + phrases). Progress dots + Back everywhere. | `pv1.js`: lands on `/onboarding`, reaches `/app` |
| Tab bar fixed | `TABS` derives from `shop.business_type` + `modules` — milk = Counter/Customers/Rates/Deliveries/Dukaan, kirana = Counter/Khata/Stock/List/Dukaan. | `proof-two.js`: milk tabs verified |
| Mic kept listening | `hardStop()` on final transcript, sheet-open, tab-hidden, logout, error; 20 s cap; mic disabled+greyed while any sheet open; truthful `mic on/off` indicator. | `mic-shutoff.js`: tracks 1→0, sockets 1→0, PASS |
| Transcript read-only | Editable input + "Dobara samjho" re-parse (parser only, no Prisma); "edited" tag. | `pv1b.js` |
| Bill not editable | Tap line → edit sheet (product search, ±qty, unit, price owner-only, delete); "+ Item jodein"; change customer. Edits re-stash via `/api/bill/edit` on confirm. | `pv1b.js`: qty 2→3, total ₹135→₹180 |
| Unknown item silent | Ask-back card + spoken question: top-3 similar / ambiguity options / quick-create form / remove. Also fires for items with weak-match options. | `pv1b.js`: boroline→created ₹45, used at once |
| Unknown customer | `customer:<name>` card → one-tap "Jodo" creates the khata. | `pv1b.js` |
| Multi-shop broken | `ShopDB(shop_id)` bound per-actor; `users`/`staff_invites`/`customer_accounts`/`customer_links` tables; signup→setup→shop-token flow. | 231 backend tests |
| `?say=` open | Build-time `NEXT_PUBLIC_SAY_HOOK`; "scripted test" label when on. | grep-verified |
| Customer join | `/join/[code]` public → name+PIN → `/m` multi-shop khata. Signup path joins in one call via `join_code`. | `pv1c.js` + `customer-join.webm` |

Remaining honest gaps (documented, not hidden):
- Forgot password = manual reset (documented in DEPLOY.md) — no email
  infra in the demo.
- `account_login` = create-on-first-name-use; a name collision on a new
  device returns "name taken — log in" (409). Multi-device identity is a
  production gap.
- Voice-edit ("Bolkar badlo") starts a fresh turn — there is no in-line
  correction grammar ("2 nahi, 3 kilo"). Explicitly deferred.
