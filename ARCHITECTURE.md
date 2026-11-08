# Architecture — Bolo Khata

```
┌─────────────────────────────────────────────────────────────────┐
│  Phones / browsers                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Owner PWA    │  │ Customer /m  │  │ Public pages           │  │
│  │ mic + counter│  │ khata app    │  │ /c confirm /r reminder │  │
│  │ (Next.js)    │  │ (Next.js)    │  │ /join /try /benchmark  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘  │
└─────────┼─────────────────┼──────────────────────┼──────────────┘
          │ HTTPS/JSON      │ HTTPS/JSON           │ HTTPS
          │ WSS /ws/stt     │                      │
┌─────────▼─────────────────▼──────────────────────▼──────────────┐
│  FastAPI backend (single process, stateless except stash+tokens) │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌────────────────────┐ │
│  │ relay.py │ │pipeline  │ │ db.py     │ │ auth.py            │ │
│  │ mic →    │ │ intent → │ │ SQLite    │ │ owner / staff /    │ │
│  │ Prisma WS│ │ proposal │ │ paise,    │ │ customer tokens    │ │
│  │          │ │ → confirm│ │ append-   │ │ role gates         │ │
│  │ tts.py   │ │ → write  │ │ only      │ │ ratelimit.py       │ │
│  │ → Timbre │ │          │ │           │ │                    │ │
│  └──────────┘ └──────────┘ └───────────┘ └────────────────────┘ │
│       │              │                                          │
│       │   vendored bolta + noiselab (rules parser, normalize)   │
└───────┼──────────────┼───────────────────────────────────────────┘
        │              │
        ▼              ▼
   api.vachana.ai  (no other LLM anywhere)
   Prisma v3.0 stream   Timbre v2.5 REST
```

## Trust boundaries

- Gnani key exists only in backend env. Browser never sees it.
- `/c/{token}`, `/r/{token}`, `/join/{code}`, `/try` are the only
  unauthenticated routes; each is scoped (random token = capability)
  or sandboxed (separate DB, daily reset, IP cap).
- Every money write goes through a stashed proposal + human confirm.
  Proposals carry the DB object they were parsed against — a `/try`
  proposal cannot write to the real ledger.
- Roles come from logins: `owner` (email+pw), `staff:{id}` (name+PIN),
  `cust:{id}` (name+PIN). Voice can propose; only the right role's
  confirm applies.

## Data invariants

- Money: integer paise, never floats.
- Ledger: append-only. Undo = reversal row, never UPDATE of history.
- Idempotency: `idempotency_key` on bill writes; `INSERT OR IGNORE`
  on skip days and links; replayed proposal ids are no-ops.
- Stock: unit-aware conversion (500 g → −0.5 kg).
- Raw mic audio is never stored (streamed through, dropped).

## Two deployment shapes

- **Dev (current):** ngrok → FastAPI :8000 → proxies page traffic to
  Next :3000. One HTTPS URL serves UI+API+WSS.
- **Prod:** Vercel (frontend) + always-on backend (Render/Railway) +
  `NEXT_PUBLIC_API_URL` env. `render.yaml`/`vercel.json` committed;
  steps in DEPLOY.md / HUMAN_TASKS.md.
