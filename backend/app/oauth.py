"""OAuth sign-in for shop owners — Google + Discord (auth-code flow).

Flow: frontend button -> GET /api/auth/{provider}?next=/path
  -> 302 to provider consent -> provider redirects to
  /api/auth/{provider}/callback -> we exchange the code, fetch the
  profile, find-or-create the owner account by email, then 302 back to
  the frontend /auth/callback page carrying a session token.

State is a stateless HMAC-signed blob (nonce + next path) keyed by
SESSION_SECRET — no server-side session store needed.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import secrets
import time
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app import auth, config
from app.db import ShopDB

log = logging.getLogger("bolo.oauth")
router = APIRouter()

_FRONTEND = os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000")
_users_db: ShopDB | None = None


def _db() -> ShopDB:
    global _users_db
    if _users_db is None:
        _users_db = ShopDB(config.DB_PATH, 1)
    return _users_db


def _fail(request: Request, reason: str) -> RedirectResponse:
    return RedirectResponse(
        f"{_FRONTEND}/auth/callback?error={reason}", status_code=302)


def _sign_state(payload: dict) -> str:
    raw = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()).decode()
    sig = hmac.new(config.SESSION_SECRET.encode(), raw.encode(),
                   hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def _verify_state(state: str) -> dict | None:
    try:
        raw, sig = state.rsplit(".", 1)
    except ValueError:
        return None
    want = hmac.new(config.SESSION_SECRET.encode(), raw.encode(),
                    hashlib.sha256).hexdigest()
    if not hmac.compare_digest(sig, want):
        return None
    try:
        data = json.loads(base64.urlsafe_b64decode(raw.encode()))
    except Exception:
        return None
    if not isinstance(data, dict) or time.time() - data.get("ts", 0) > 600:
        return None
    return data


def _api_base(request: Request) -> str:
    return (config.OAUTH_REDIRECT_BASE
            or str(request.base_url).rstrip("/"))


def _provider(name: str) -> dict | None:
    if name == "google" and config.GOOGLE_CLIENT_ID:
        return {
            "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
            "token": "https://oauth2.googleapis.com/token",
            "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
            "scope": "openid email profile",
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
        }
    if name == "discord" and config.DISCORD_CLIENT_ID:
        return {
            "authorize": "https://discord.com/oauth2/authorize",
            "token": "https://discord.com/api/oauth2/token",
            "userinfo": "https://discord.com/api/users/@me",
            "scope": "identify email",
            "client_id": config.DISCORD_CLIENT_ID,
            "client_secret": config.DISCORD_CLIENT_SECRET,
        }
    return None


@router.get("/api/auth/providers")
def providers():
    return {"google": bool(config.GOOGLE_CLIENT_ID),
            "discord": bool(config.DISCORD_CLIENT_ID)}


@router.get("/api/auth/{provider}")
def oauth_start(provider: str, request: Request, next: str = "/login"):
    """Kick off the consent redirect. `next` is a same-site path."""
    p = _provider(provider)
    if p is None:
        raise HTTPException(503, f"{provider} sign-in not configured")
    if not next.startswith("/") or next.startswith("//"):
        next = "/login"
    state = _sign_state({"ts": time.time(), "next": next})
    redirect_uri = f"{_api_base(request)}/api/auth/{provider}/callback"
    url = p["authorize"] + "?" + urlencode({
        "client_id": p["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": p["scope"],
        "state": state,
    })
    return RedirectResponse(url, status_code=302)


def _exchange(p: dict, code: str, redirect_uri: str) -> str | None:
    """Swap the auth code for an access token; None on failure."""
    try:
        r = requests.post(p["token"], data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": p["client_id"],
            "client_secret": p["client_secret"],
        }, timeout=15)
        if not r.ok:
            log.warning("oauth token exchange failed: %s %s",
                        r.status_code, r.text[:200])
            return None
        return r.json().get("access_token")
    except requests.RequestException as e:
        log.warning("oauth token exchange error: %s", e)
        return None


def _userinfo(p: dict, access_token: str) -> dict | None:
    try:
        r = requests.get(p["userinfo"], headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }, timeout=15)
        return r.json() if r.ok else None
    except (requests.RequestException, ValueError) as e:
        log.warning("oauth userinfo error: %s", e)
        return None


@router.get("/api/auth/{provider}/callback")
def oauth_callback(provider: str, request: Request,
                   code: str = "", state: str = "",
                   error: str = ""):
    if error:
        return _fail(request, "denied")
    st = _verify_state(state)
    if st is None:
        return _fail(request, "bad_state")
    p = _provider(provider)
    if p is None or not code:
        return _fail(request, "config")
    redirect_uri = f"{_api_base(request)}/api/auth/{provider}/callback"
    token = _exchange(p, code, redirect_uri)
    if not token:
        return _fail(request, "exchange")
    info = _userinfo(p, token)
    email = (info or {}).get("email") or ""
    email = email.strip().lower()
    if not email or "@" not in email:
        return _fail(request, "no_email")
    name = ((info or {}).get("name")
            or " ".join(x for x in ((info or {}).get("given_name"),
                                    (info or {}).get("family_name"))
                       if x) or "")[:60]

    db = _db()
    row = db.user_by_email(email)
    if row is None:
        try:
            uid = db.create_oauth_user(email, name)
        except Exception:
            # race: another request created it first
            row = db.user_by_email(email)
            if row is None:
                return _fail(request, "create")
            uid = row["id"]
    else:
        uid = row["id"]
        if name and not (row["name"] or "").strip():
            db.conn.execute("UPDATE users SET name=? WHERE id=?",
                            (name, uid))
            db.conn.commit()
    user = db.user_by_id(uid)
    shop_id = user["shop_id"] or 0
    sess = auth.issue_token(f"owner:{uid}", shop_id)
    params = urlencode({
        "token": sess, "role": user["role"] or "owner",
        "shop_id": shop_id,
        "needs_onboarding": int(not shop_id),
        "next": st.get("next") or "/login",
    })
    return RedirectResponse(
        f"{_FRONTEND}/auth/callback?{params}", status_code=302)
