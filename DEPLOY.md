# Deploy — always-on (no cold starts during the demo)

Architecture in prod is two URLs (this is fine — no proxy needed):

- **Frontend** → Vercel (free, Next.js native)
- **Backend** → Render `starter` ($7/mo, always-on) **or** Railway (~$5/mo)
  — the WebSocket relay needs a real process, not serverless.

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
