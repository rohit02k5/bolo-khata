# Deploy — always-on (no cold starts during the demo)

## CURRENT LIVE URL (verified 2026-11-10)

**`https://bolo-khata.onrender.com`** — single Render web service
(`srv-dbp9airm8hqs73d88l2g`, region `oregon`) built from the repo-root
`Dockerfile`: Next.js `next start` on :3000 + FastAPI `uvicorn` on the
Render `$PORT`, with the backend proxying all page traffic to the
frontend — so ONE public URL serves the whole app.

Verified on the live URL:
- `/healthz` → `{"ok":true,"mock_gnani":false}` — **real Gnani**, not mock
- `/` and `/try` → 200 through the built-in proxy
- Owner signup → `/api/shop/setup` (kirana starter catalog) → login OK
- `/api/command` → `"2 kilo cheeni 1 maggi"` parses to a real ₹104
  proposal on the deployed service
- `POST /api/tts` → real Timbre WAV (~61 KB)
- `GET /ws/stt` → `101 Switching Protocols` — the Prisma WS relay
  upgrades fine on Render

Environment set on the service (values live in Render's dashboard /
`backend/.env`, never in git): `GNANI_API_KEY`, `OWNER_EMAIL`,
`OWNER_PASSWORD`, `SESSION_SECRET`, `SHOP_NAME`, `SHOP_VPA`,
`FRONTEND_ORIGIN=http://localhost:3000` (internal Next server),
`CORS_ORIGINS=*`, `STT_MODEL`, `TTS_MODEL`.

### Free-tier caveats (plan = `free`)

- **Sleeps after ~15 min idle** → first request takes ~30–60 s to wake.
  Before a demo, hit `/healthz` once to warm it, or attach a free
  UptimeRobot monitor pinging `/healthz` every 5 min. Upgrade to
  `starter` ($7/mo) for always-on.
- **SQLite is on ephemeral disk** → redeploys/restarts reseed the demo
  shop (fresh signups needed). Intentional for the demo; document as
  a limitation.

Old ngrok URL (`departed-asparagus-catalog.ngrok-free.dev`) is dead —
it lived only while the laptop + tunnel were up.

Prior notes retained below (Vercel fallback, Railway option, blueprint):

## Option A — Render (recommended, blueprint included)

1. render.com → sign up with **rohitiitbh@gmail.com** (GitHub login).
2. New → **Blueprint** → connect repo `rohit02k5/bolo-khata`.
   `render.yaml` creates `bolo-khata-api` (Docker, plan `starter`).
3. In the service's Environment tab set the `sync:false` secrets:
   `GNANI_API_KEY`, `OWNER_PASSWORD`, `SESSION_SECRET`.
4. Note the URL, e.g. `https://bolo-khata-api.onrender.com`.

## Option B — Railway

```bash
railway login            # browser OAuth (your account)
railway init             # in bolo-khata/backend
railway up               # deploys backend/Dockerfile
railway variables set GNANI_API_KEY=... OWNER_PASSWORD=... SESSION_SECRET=...
railway domain           # get the public URL
```

## Frontend — Vercel

```bash
vercel login             # email link to rohitiitbh@gmail.com
cd frontend
vercel --prod \
  -e NEXT_PUBLIC_API_URL=https://<backend-url-from-above>
# or in the dashboard: root dir = frontend, env var same
```

Then back on the API: set `CORS_ORIGINS=https://<vercel-url>` and
`FRONTEND_ORIGIN=https://<vercel-url>` (the latter lets the API domain
also serve the whole UI through the built-in proxy — a second public URL).

## Wake-up / smoke step (before every demo)

```bash
curl https://<backend>/healthz    # expect {"ok":true,...} in <2s
curl https://<backend>/api/login -d ...   # login works
```

SQLite lives on the instance's ephemeral disk → each redeploy reseeds
the demo shop. That is intentional for the demo (predictable state),
document it as a limitation in README.

## product-v1 notes

- **Routes**: public `/` is now the landing page; the product lives at
  `/app` (owner/staff), `/m` (customer). Redirects handle stale sessions
  → `/login`. Nothing to configure — all routes are static-app routes.
- **`NEXT_PUBLIC_SAY_HOOK`**: the `?say=` scripted-test hook compiles in
  ONLY when this env var is `1` at build time. For the film and public
  deploys, build WITHOUT it — the param becomes a no-op. It is enabled
  locally in `frontend/.env.production.local` (gitignored) for the
  automated proof recordings only.
- **Forgot password (documented manual reset)**: delete the user row
  (`DELETE FROM users WHERE email=?`) and re-signup, or update
  `password_hash` with `ShopDB._pw_hash(new_pw, salt)` — for the demo,
  re-signup on the same email is the supported path.
- **New env surface**: `SESSION_SECRET` still signs all tokens; no new
  required vars. `DB_PATH` is a single SQLite file holding all shops —
  back it up as before.
- **Multi-shop**: every token is shop-bound; public links
  (`/c`, `/r`, `/join`) are unguessable-UUID scoped — no change to deploy.
