"""Seeded-owner auth: email+password -> bearer token (in-memory).

One owner role for the hero flow (approved scope). Assistant role is
deferred; when it lands, add a `role` claim and gate destructive ops.
"""

from __future__ import annotations

import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from app import config

router = APIRouter()

_TOKENS: dict[str, tuple[str, float]] = {}
_TTL = 12 * 3600


class LoginReq(BaseModel):
    email: str
    password: str


@router.post("/api/login")
def login(req: LoginReq):
    if not config.OWNER_PASSWORD:
        raise HTTPException(500, "owner password not configured")
    if req.email != config.OWNER_EMAIL \
            or not secrets.compare_digest(req.password, config.OWNER_PASSWORD):
        raise HTTPException(401, "wrong email or password")
    token = secrets.token_urlsafe(32)
    _TOKENS[token] = (req.email, time.time() + _TTL)
    return {"token": token, "role": "owner"}


def current_actor(authorization: str = Header(default="")) -> str:
    """Dependency: returns 'owner' or raises 401.

    Open when AUTH_REQUIRED is unset — the seeded demo owner is the only
    role anyway during Phase 1.
    """
    if not config.OWNER_PASSWORD:
        return "owner"
    token = authorization.removeprefix("Bearer ").strip()
    info = _TOKENS.get(token)
    if info and info[1] > time.time():
        return "owner"
    raise HTTPException(401, "login required")
