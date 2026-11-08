# Contributions

Draft — Rohit and Harshita will correct to match reality. Outside code
is credited honestly: the `bolta`/`noiselab` packages are Harshita's
prior work (vendored verbatim); everything else in this repo was
written for this project.

| Person | Role | Owned |
|---|---|---|
| **Harshita** (A) | Voice / core | NoiseLab benchmark harness (1,008 real Prisma jobs, telephony-degraded audio, per-language splits, failure taxonomy), `bolta` rules parser (Hinglish/Telugu intents, fuzzy resolve, append-only ledger, confirm-before-write), `noiselab` normalize/degrade/score utilities, Streamlit prototype (kept runnable as labelled fallback), catalog/customer seed data, verified API quirks (header set, indic-auto, WAF/FLAC notes). |
| **Rohit** (B) | Web / platform | Product direction, review, deployment accounts, Telugu review, real-phone testing, filming + posting. |
| **Devin** (agent) | Implementation | FastAPI backend (relay, pipeline, db, auth, tts, ratelimit, biztypes), multi-item bill parser, delivery-skip billing, voice-note reminders, weekly insights, customer accounts + /m app, staff roles + dual-approval leave, /try sandbox, Next.js PWA + all public pages, deploy configs, 218 tests, all docs. |

Honest boundary: the vendored `bolta`/`noiselab` packages and the
measured benchmark numbers are Harshita's work; the web app around them
was built in this repo. See `frontend/app/benchmark/page.tsx` for how
the numbers are labeled (NoiseLab v2.5 matrix vs live v3.0 spot checks).
