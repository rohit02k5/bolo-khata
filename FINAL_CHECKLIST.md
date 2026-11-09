# Final checklist — filming day (Nov 9)

## LIVE URL

**`https://departed-asparagus-catalog.ngrok-free.dev`** (ngrok → local
backend proxying the prod frontend). Verified 2026-11-09: 44/44
deployed-URL journey checks green — owner signup+onboarding, ₹174 hero
khata (stock 25→23, pending confirm), unknown-item ask-back, transcript
re-parse + bill edits, cash + UPI QR, confirm/dispute links, real-audio
mic shutoff (0 tracks / 0 sockets after final + on tab-hide), Telugu
₹90, customer signup→join→khata, voice-note audio page, milk skip-day +
month bill, staff 403 + leave dual-approval, undo, /about /benchmark
/try, security headers, rate limit. Proof: `docs/proof/j*.webm|.png`.

## T-2h: wake-up & warm (no cold starts mid-take)

- [ ] Confirm the deployed backend is **always-on** (Render paid / Railway
      — free tiers sleep). If still on ngrok: keep this laptop awake,
      plugged in, ngrok running, and hit `/healthz` every ~5 min.
- [ ] Warm Timbre: trigger one TTS (say anything short) — first call of a
      session is the slowest.
- [ ] Warm Prisma: run one short utterance through the mic so the WS
      handshake + `indic-auto` detection are primed.
- [ ] Owner login works (`owner@bolokhata.demo` — password changed from
      the dev default; it's in `.env`, not in any doc).
- [ ] `NEXT_PUBLIC_API_URL` on the frontend points at the live backend
      (check `wss://…/ws/stt` connects — mic button goes "listening").

## T-1h: real-phone smoke (Android)

- [ ] Open the URL in **Chrome** (mic permission → Allow).
- [ ] Fresh profile check: `/` shows the landing page; log in → `/app`
      (already-onboarded owners skip onboarding).
- [ ] Full hero pass: hero phrase → card → read-back → Khata → customer
      phone opens `/c/[token]` → Confirm → owner sees confirmed.
- [ ] Mic check: after the bill sheet appears, the tab recording dot is
      OFF; while any sheet is open the mic button is greyed.
- [ ] Dispute path on a second entry.
- [ ] UPI button shows QR + `upi://` link (paying is optional).
- [ ] "dudh ka bill", "aaj ka hisaab", "Ramesh ko yaad dilao" all answer.
- [ ] Undo restores stock.
- [ ] Screen stays awake; disable notifications on both phones.
- [ ] If mobile data: confirm the tunnel/host survives a Wi-Fi→data
      switch (reload once).

## Freeze rules (9 PM Nov 9, and once filming starts)

- [ ] No changes to the hero flow after the video is recorded.
- [ ] Bug fixes only; every fix gets a test.
- [ ] No deploys during filming unless the site is actually down.

## Submission (Nov 10)

- [ ] Repo flipped public; `git secrets`/`check_secrets.py` clean.
- [ ] SUBMISSION.md text pasted; demo video linked; models named =
      **Prisma + Timbre** only.
- [ ] Demo URL or "runs locally in 2 commands" documented.

## Known sharp edges to avoid on camera

- ngrok free shows a one-time interstitial → click through it BEFORE
  filming (production deploy removes this).
- Prisma stream: finals only (no partial words) — talk normally, pause.
- Avoid saying two customer names in one sentence (resolver picks last).
- Telugu TTS works (Suhana) — keep Telugu phrases short and rehearsed.
