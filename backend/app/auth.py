"""Auth: email+password users, seeded owner, staff PIN, customer PIN.

Tokens map to (actor, shop_id) in memory with a TTL. Roles and shop
scope are decided server-side by the login on each device — never by
voice.
"""

from __future__ import annotations

import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app import config

router = APIRouter()

# token -> (actor, shop_id, expiry)
#   actor:  "owner" | "owner:{user_id}" | "staff:{id}" | "cust:{account_id}"
#   shop_id: 0 means "no shop yet" (fresh signup before onboarding)
_TOKENS: dict[str, tuple[str, int, float]] = {}
_TTL = 12 * 3600


class LoginReq(BaseModel):
    email: str
    password: str


def issue_token(actor: str, shop_id: int) -> str:
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = (actor, shop_id, time.time() + _TTL)
    return token


def _lookup(authorization: str) -> tuple[str, int]:
    token = authorization.removeprefix("Bearer ").strip()
    info = _TOKENS.get(token)
    if info and info[2] > time.time():
        return info[0], info[1]
    raise HTTPException(401, "login required")


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
