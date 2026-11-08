"""Tiny per-IP daily limiter — in-memory, enough for a demo sandbox."""

from __future__ import annotations

import time


class DailyLimiter:
    def __init__(self) -> None:
        self._b: dict[str, tuple[int, str]] = {}

    def hit(self, key: str, limit: int) -> bool:
        """True if the request is within today's allowance."""
        today = time.strftime("%Y-%m-%d", time.gmtime())
        n, day = self._b.get(key, (0, today))
        if day != today:
            n = 0
        n += 1
        self._b[key] = (n, today)
        return n <= limit


limiter = DailyLimiter()
