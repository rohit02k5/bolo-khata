# Human tasks — one batch, in order

Items marked **[before filming]** must be done before the video is
recorded. Everything else can happen after.

## 1. Deploy accounts + env vars [before filming]

**Vercel (frontend):**
1. Go to vercel.com → Sign up/login with `rohitiitbh@gmail.com`.
2. Import the GitHub repo `rohit02k5/bolo-khata`.
3. Root directory: `frontend`. Framework: Next.js (auto-detected).
4. Env var: `NEXT_PUBLIC_API_URL` = your backend URL from step 2 below
   (e.g. `https://bolo-khata-api.onrender.com`). Deploy.

**Render (backend, always-on — free tier sleeps, use paid "Starter" ~$7):**
1. render.com → sign up with `rohitiitbh@gmail.com` → New → Web Service
   → connect `rohit02k5/bolo-khata` repo → it reads `render.yaml`
   automatically.
2. Set env vars in the dashboard:
   - `GNANI_API_KEY` = (from backend/.env — do NOT paste in chat/git)
   - `OWNER_EMAIL` = `owner@bolokhata.demo`
   - `OWNER_PASSWORD` = (from backend/.env — do NOT paste in git)
   - `SESSION_SECRET` = any long random string
   - `SHOP_VPA` = your UPI id (e.g. `name@upi`) for the QR
   - `CORS_ORIGINS` = your Vercel URL
3. Deploy → note the URL → set it as `NEXT_PUBLIC_API_URL` in Vercel →
   redeploy frontend.

**Health check:** open `https://<backend>/healthz` → expect
`{"ok":true,"mock_gnani":false,...}`. If asleep, wait ~30s once, then
it's warm (paid tier won't sleep again).

**Keep-alive:** Render Starter never sleeps. If on a free tier instead,
add `https://<backend>/healthz` to a free uptime monitor (UptimeRobot,
cron-job.org) pinging every 5 min.

## 2. Android phone test — mobile data, not Wi-Fi [before filming]

1. Chrome → open the deployed URL (or the ngrok interim URL).
2. Allow mic permission. Login as owner.
3. Hero Hinglish: `2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam`
   → card → read-back → tap Khata.
4. Second phone → open the `/c/[token]` link → tap Confirm → owner sees
   confirmed. Do a Dispute too.
5. Telugu: switch to తెలుగు tab → `రెండు కిలో పంచదార రమేష్ పేరు` → card
   → confirm → Telugu spoken reply plays.
6. `Ramesh ko yaad dilao` → confirm → customer phone opens `/r/[token]`
   → audio plays.
7. `dudh ka bill`, `is hafte ka hisaab`, `galat wapas` (undo restores
   stock).
8. UPI button → QR + `upi://` link shows. Join QR on Shop tab → second
   phone scans → joins with PIN → `/m` shows balance.

## 3. Rohit Telugu listening review [before filming]

- Open `TELUGU_REVIEW.md`, play each spoken item on the phone, tick/fix
  inline. Flag anything Timbre reads wrong (esp. digits).

## 4. Record the 20 test phrases [can be after filming]

- Follow `benchmarks/RECORDING_GUIDE.md` — 15 Hinglish + 5 Telugu,
  4 conditions each, save as `recordings/{lang}/{condition}/{id}.wav`.
- Run `scripts/score_recordings.py`, commit `scores.csv`, update
  `/benchmark` numbers.

## 5. Film [before Nov 9 evening]

- Follow `DEMO_SCRIPT.md` (90s; 60s cut also written). Kirana store =
  better backdrop; counter noise is a feature. Two phones charged,
  notifications off, screen awake.

## 6. Post

- LinkedIn: `POST_DRAFTS.md` long form, from Rohit's account; Harshita
  reposts/comments. Tag Gnani AI,
  `#GreatIndianAIInternshipChallenge #GnaniAI`.
- X: short post + video link.
- Nominate the two post links for submission.

## 7. Submit

- Flip repo `rohit02k5/bolo-khata` to **public** (check no .env
  committed — `check_secrets.py` is clean).
- Paste `SUBMISSION.md` into the form. Attach video + post links.
- Answer comments from the comment-reply bank in POST_DRAFTS.
