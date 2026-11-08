# Contributions

| Person | Role | Owned |
|---|---|---|
| **Harshita** (A) | Voice / core | NoiseLab benchmark harness (1,008 real Prisma jobs, telephony-degraded audio, per-language splits), `bolta` rules parser (Hinglish/Telugu intents, fuzzy resolve, append-only ledger, confirm-before-write), Streamlit prototype (kept runnable as fallback), catalog/customer seed data, API-quirk findings baked into `AGENTS.md`. |
| **Rohit** (B) | Web / platform | Product direction, review, phone testing, deployment accounts. |
| **Devin** (agent) | Implementation | FastAPI backend (relay, pipeline, db, auth, tts), multi-item bill parser, delivery-skip billing, voice-note reminders, Next.js PWA + customer confirm/join/reminder pages, deployment config, tests, docs. |

Honest boundary: the vendored `bolta`/`noiselab` packages and the
measured benchmark numbers are Harshita's work; the web app around them
was built in this repo. See `frontend/app/benchmark/page.tsx` for how
the numbers are labeled (NoiseLab v2.5 matrix vs live v3.0 spot checks).
