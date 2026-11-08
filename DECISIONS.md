# Decisions log — safest defaults chosen while working autonomously

| # | Decision | Why |
|---|---|---|
| 1 | **SQLite for this build** (`data/bolo.db`), Postgres schema kept as `schema.sql` reference | Zero-ops demo reliability; integer-paise + append-only semantics preserved. "RLS" for roles is enforced in FastAPI dependencies (`require_owner`, `current_staff`, `current_customer`) — same guarantee, honest implementation. |
| 2 | **Customer auth = name + 4-digit PIN**, salted sha256 hash, first-claim-wins | No phone number collection (DPDP-lite), no SMS cost, works on any browser. Not high-security — PIN is a khata-door, not a bank vault. Wrong PIN on a claimed name → 401. |
| 3 | **PIN join always provisions a NEW khata row** (idempotent per account+shop); anonymous join falls back to name-match-or-create | Spec: a customer who joins via QR gets their own khata, not just a name-match. Anonymous joins have no identity to dedupe on, so match-or-create prevents dup-spam. Consequence: same-named rows can coexist → the resolver's ambiguity card asks which one (confirm-first, by design). |
| 4 | **Staff = seeded "Amit" (PIN in env/seeding), role `assistant`** | Demo needs one real second device. Staff can bill + stock but NOT undo, leave-mark, or shop config — enforced server-side at `/api/confirm` (peek_intent) and `/api/undo` (require_owner). |
| 5 | **Leave = dual approval**: owner voice-marks, staff must accept/dispute; append-only `leave_events` | Matches the customer-confirm trust model; both sides' states visible. |
| 6 | **Month bill = days-in-month − skips** (projects future skips) | Milkman billing convention; a "kal se skip" immediately reflects in the estimate. |
| 7 | **Ambiguous delivery product → ask which customer**, never silent-pick | "dudh band karo" with 2 doodh subscribers returns a clarification, not a guess. Same rule as fuzzy-match ties. |
| 8 | **/try sandbox: own SQLite file, recreated daily, 60 cmds/day/IP** | Judges get the full parse+ledger loop with zero credential handling and near-zero credit burn (voice relay is live but stores nothing). |
| 9 | **Proposal → stashed `db` object, not just a flag** | `/try` proposals can never write to the real ledger even if confirmed via the wrong endpoint — the stash carries its store. |
| 10 | **Noise indicator = honest proxy** | `noise_hint` = parse confidence <0.75 OR unresolved items OR detected-lang mismatch. Labeled "parse conf"/"noise — check card", never claimed as ASR confidence. |
| 11 | **No assistant-voice commands for roles** | Roles come from logins on each device. Voice can *propose* (e.g. leave-mark) but only the owner's confirm writes — same trust pattern as bills. |
| 12 | **Evon absent everywhere** | Verified 2026-11-08: Gnani console has no Evon API; FriendliAI lists it only as a paid dedicated-GPU endpoint (~$4–12/hr), not a callable API. Named nowhere except README/CODE_TOUR as "verified unused". |
| 13 | **English spoken replies fall back to Hinglish where no en template exists** | en UI exists; voice summaries/templates cover hi/te fully, en partially — logged rather than silently mixed. |
| 14 | **ngrok remains interim URL**; Vercel+Render configs committed but deployment needs owner's OAuth (in HUMAN_TASKS) | Can't log into someone's accounts autonomously. |
| 15 | **Assistant role UI**: staff logs in on the same page (Owner/Staff toggle); Shop tab + undo hidden client-side AND enforced server-side | Defense in depth — the server check is the real gate. |
