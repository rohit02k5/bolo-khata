"""One-command smoke test — real Gnani calls, no mocks.

    python scripts/smoke.py

Checks: Timbre TTS -> Prisma STT on the synth'd audio -> pipeline parse.
Prints per-stage latency and PASS/FAIL. Uses ~2 credits.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import app.bootstrap  # noqa: E402,F401
import httpx  # noqa: E402

from app import config  # noqa: E402


def _post(url, **kw):
    """The Gnani edge intermittently resets connections — retry."""
    for i in range(4):
        try:
            return httpx.post(url, **kw)
        except (httpx.ConnectError, httpx.ReadError,
                httpx.RemoteProtocolError):
            if i == 3:
                raise
            time.sleep(0.5 * (i + 1))


def main() -> int:
    if not config.GNANI_API_KEY:
        print("FAIL  GNANI_API_KEY not set"); return 1

    # 1. Timbre
    t0 = time.time()
    r = _post(
        config.TTS_REST_URL,
        headers={"X-API-Key-ID": config.GNANI_API_KEY},
        json={"text": "Rahul ne paanch sau rupay die",
              "voice": "Poorvi", "model": config.TTS_MODEL,
              "language": "hi-en", "speed": 1.0,
              "audio_config": {"sample_rate": 16000,
                               "encoding": "linear_pcm",
                               "container": "wav"}},
        timeout=30)
    tts_ms = int((time.time() - t0) * 1000)
    ok = r.status_code == 200 and len(r.content) > 1000
    print(f"{'PASS' if ok else 'FAIL'}  Timbre tts      {tts_ms}ms "
          f"({r.status_code}, {len(r.content)}B)")
    if not ok:
        return 1
    audio = r.content

    # 2. Prisma STT on that audio (vendored SDK path, hi-IN)
    import tempfile
    t0 = time.time()
    text = ""
    err = ""
    try:
        from noiselab.api import transcribe
        with tempfile.NamedTemporaryFile(
                suffix=".wav", delete=False) as f:
            f.write(audio)
            tmp = f.name
        res = transcribe(tmp, "hi-IN", format="transcribe")
        text = (res.get("transcript") or res.get("text") or "") \
            if isinstance(res, dict) else str(res)
    except Exception as e:  # noqa: BLE001
        err = str(e)[:120]
    stt_ms = int((time.time() - t0) * 1000)
    ok = bool(text.strip())
    print(f"{'PASS' if ok else 'FAIL'}  Prisma stt-rest {stt_ms}ms "
          f"-> {text[:60]!r} {err}")
    if not ok:
        return 1

    # 3. Pipeline parse (offline, no API)
    t0 = time.time()
    from app.db import ShopDB
    from app.pipeline import command_to_proposal
    db = ShopDB(":memory:")
    from app.seed import seed
    db.seed_if_empty(seed)
    p = command_to_proposal("Rahul ne paanch sau rupay diye",
                            "hinglish", db)
    parse_ms = int((time.time() - t0) * 1000)
    ok = p["intent"] in ("record_payment", "add_bill") and \
        p["confidence"] > 0
    print(f"{'PASS' if ok else 'FAIL'}  parse           {parse_ms}ms "
          f"-> {p['intent']}")
    print("SMOKE", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
