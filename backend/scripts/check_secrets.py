"""Fail if a secret-like pattern is staged/present in tracked files.

Run: python scripts/check_secrets.py [path ...]
CI/pre-commit: scans tracked files; exits 1 on any match.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

PATTERNS = [
    (re.compile(r"vach_[A-Za-z0-9_]{40,}"), "Gnani API key"),
    (re.compile(r"nvapi-[A-Za-z0-9_-]{20,}"), "NVIDIA API key"),
    (re.compile(r"gsk_[A-Za-z0-9]{20,}"), "Groq API key"),
    (re.compile(r"AIza[0-9A-Za-z_-]{20,}"), "Google API key"),
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"), "private key"),
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "OpenAI-style key"),
]

ALLOWED_SUBSTR = ("your_key_here", "change-me", "example", "placeholder")


def tracked_files() -> list[str]:
    try:
        out = subprocess.run(
            ["git", "ls-files"], capture_output=True, text=True, check=True)
        return [f for f in out.stdout.splitlines() if f]
    except Exception:  # noqa: BLE001 - not a git repo yet
        return []


def scan(path: Path) -> list[str]:
    hits = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return hits
    for pat, label in PATTERNS:
        for m in pat.finditer(text):
            if not any(a in text[max(0, m.start()-60):m.end()] for a in ALLOWED_SUBSTR):
                hits.append(f"{path}: {label} matched")
    return hits


def main() -> int:
    args = sys.argv[1:]
    files = args or [f for f in tracked_files()
                     if Path(f).suffix not in
                     {".png", ".jpg", ".ico", ".woff", ".lock"}]
    hits = []
    for f in files:
        p = Path(f)
        if p.name == "check_secrets.py" or p.name.endswith(".example"):
            continue
        hits.extend(scan(p))
    for h in hits:
        print("SECRET:", h)
    if hits:
        print(f"\n{len(hits)} potential secret(s) found — remove before commit.")
        return 1
    print("ok - no secrets detected")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
