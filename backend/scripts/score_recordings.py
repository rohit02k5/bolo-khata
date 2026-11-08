"""Score recorded phrases through Prisma + the rules parser.

Usage (from backend/):
    .venv/Scripts/python scripts/score_recordings.py \
        --root ../benchmarks/recordings --out ../benchmarks/scores.csv

Layout expected:
    recordings/{lang}/{condition}/{phrase_id}.wav
    e.g. recordings/hinglish/shop_noise/h01.wav

Conditions: quiet | shop_noise | traffic | speakerphone (free-form dirs ok).
STT results are cached by the vendored transcribe_cached() so re-scoring
never pays twice. Writes scores.csv next to --out.
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import app.bootstrap  # noqa: E402,F401

PHRASES = Path(__file__).resolve().parent.parent.parent / \
    "benchmarks" / "phrases.csv"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", required=True)
    ap.add_argument("--out", default="scores.csv")
    ap.add_argument("--phrases", default=str(PHRASES))
    args = ap.parse_args()

    expected = {}
    with open(args.phrases, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            expected[r["id"]] = r

    from app.db import ShopDB
    from app.seed import seed
    from app.pipeline import command_to_proposal
    from noiselab.api import transcribe_cached

    db = ShopDB(":memory:")
    db.seed_if_empty(seed)
    rows = []
    for wav in sorted(Path(args.root).rglob("*.wav")):
        rel = wav.relative_to(args.root)
        lang = rel.parts[0] if len(rel.parts) > 2 else "hinglish"
        cond = rel.parts[1] if len(rel.parts) > 2 else "quiet"
        pid = wav.stem
        exp = expected.get(pid, {})
        t0 = time.time()
        try:
            res = transcribe_cached(wav, "hi-IN" if lang != "te"
                                    else "te-IN", format="transcribe")
            text = res.get("transcript", "") \
                if isinstance(res, dict) else str(res)
            stt_err = ""
        except Exception as e:  # noqa: BLE001
            text, stt_err = "", str(e)[:80]
        stt_ms = int((time.time() - t0) * 1000)
        intent, total, conf = "", "", 0.0
        if text:
            p = command_to_proposal(text, lang, db)
            intent = p["intent"]
            total = p.get("total_paise") or ""
            conf = p["confidence"]
        exp_intent = exp.get("expect_intent", "")
        exp_total = exp.get("expect_total_paise", "")
        ok = (intent == exp_intent or not exp_intent) and \
            (str(total) == str(exp_total) or not exp_total)
        rows.append({"id": pid, "lang": lang, "condition": cond,
                     "transcript": text, "intent": intent,
                     "expect_intent": exp_intent, "total": total,
                     "expect_total": exp_total, "confidence": conf,
                     "stt_ms": stt_ms, "stt_err": stt_err,
                     "ok": int(bool(ok))})
        print(f"{pid} {lang}/{cond}: {intent} "
              f"({'OK' if ok else 'MISS'}) {stt_ms}ms")

    fields = ["id", "lang", "condition", "transcript", "intent",
              "expect_intent", "total", "expect_total", "confidence",
              "stt_ms", "stt_err", "ok"]
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fields)
        w.writeheader()
        w.writerows(rows)
    ok_n = sum(r["ok"] for r in rows)
    print(f"\n{ok_n}/{len(rows)} intent+total OK -> {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
