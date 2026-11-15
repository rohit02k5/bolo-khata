"""Auth: email+password users, seeded owner, staff PIN, customer PIN.

Tokens are stateless HMAC-signed blobs (actor, shop_id, expiry) keyed
by SESSION_SECRET — they survive backend restarts and redeploys, which
matters on hosts that recycle the process (Render free tier, dev).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app import config

router = APIRouter()

#   actor:  "owner" | "owner:{user_id}" | "staff:{id}" | "cust:{account_id}"
#   shop_id: 0 means "no shop yet" (fresh signup before onboarding)
_TTL = 12 * 3600


def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def issue_token(actor: str, shop_id: int) -> str:
    payload = {"a": actor, "s": int(shop_id),
               "e": time.time() + _TTL}
    raw = _b64e(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(config.SESSION_SECRET.encode(), raw.encode(),
                   hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _lookup(authorization: str) -> tuple[str, int]:
    token = authorization.removeprefix("Bearer ").strip()
    try:
        raw, sig = token.rsplit(".", 1)
    except ValueError:
        raise HTTPException(401, "login required")
    want = hmac.new(config.SESSION_SECRET.encode(), raw.encode(),
                    hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, want):
        raise HTTPException(401, "login required")
    try:
        data = json.loads(_b64d(raw))
        actor, shop_id, exp = data["a"], int(data["s"]), float(data["e"])
    except Exception:
        raise HTTPException(401, "login required")
    if exp < time.time():
        raise HTTPException(401, "login required")
    return actor, shop_id


@router.post("/api/login")
def login(req: LoginReq):
    """Seeded demo-owner login (kept for /try and filming). Real
    accounts use /api/signup + /api/session/login below."""
    if not config.OWNER_PASSWORD:
        raise HTTPException(500, "owner password not configured")
    if req.email != config.OWNER_EMAIL \
            or not secrets.compare_digest(req.password, config.OWNER_PASSWORD):
        raise HTTPException(401, "wrong email or password")
    return {"token": issue_token("owner", 1), "role": "owner",
            "shop_id": 1}


def current_actor(authorization: str = Header(default="")) -> str:
    """Dependency: returns 'owner' / 'staff:{id}' or raises 401.

    Open when AUTH_REQUIRED is unset — the seeded demo owner is the only
    role anyway during Phase 1.
    """
    if not config.OWNER_PASSWORD:
        return "owner"
    return _lookup(authorization)[0]


def actor_shop(authorization: str = Header(default="")) -> tuple[str, int]:
    """Dependency: returns (actor, shop_id). Unauthenticated dev mode
    falls back to the seeded shop."""
    if not config.OWNER_PASSWORD:
        return "owner", 1
    return _lookup(authorization)


def require_owner(authorization: str = Header(default="")) -> str:
    """Dependency: only the owner passes. Staff + customers get 403."""
    actor = current_actor(authorization)
    if not actor.startswith("owner"):
        raise HTTPException(403, "owner-only action")
    return actor


def require_owner_shop(
        authorization: str = Header(default="")) -> tuple[str, int]:
    """Dependency: owner only, with shop scope."""
    actor, shop_id = actor_shop(authorization)
    if not actor.startswith("owner"):
        raise HTTPException(403, "owner-only action")
    return actor, shop_id


def issue_staff_token(staff_id: int, shop_id: int = 1) -> str:
    return issue_token(f"staff:{staff_id}", shop_id)


def current_staff(authorization: str = Header(default="")) -> int:
    """Dependency: returns staff_id or raises 401."""
    actor, _ = _lookup(authorization)
    if actor.startswith("staff:"):
        return int(actor.split(":", 1)[1])
    raise HTTPException(401, "staff login required")


def issue_customer_token(account_id: int) -> str:
    return issue_token(f"cust:{account_id}", 0)


def current_customer(authorization: str = Header(default="")) -> int:
    """Dependency: returns customer account_id or raises 401."""
    actor, _ = _lookup(authorization)
    if actor.startswith("cust:"):
        return int(actor.split(":", 1)[1])
    raise HTTPException(401, "customer login required")
