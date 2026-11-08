"""Bolo Khata backend — FastAPI app.

Routes: health, auth, WS STT relay, command proposals, confirm writes,
ledger/stock queries, public customer-confirmation endpoint, reminders,
TTS proxy. All writes are idempotent where a client supplies a key.
"""

from __future__ import annotations

import json
import logging
import os

import app.bootstrap  # noqa: F401  (vendor path + dotenv, import first)
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import auth, config, pipeline, relay, speak_text, tts
from app.db import ShopDB
from app.seed import seed

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Bolo Khata", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

db = ShopDB(config.DB_PATH)
db.seed_if_empty(seed)
# idempotent backfills for pre-existing DBs (new aliases, subscriptions)
from app.seed import sync_catalog, seed_subscriptions, seed_staff
sync_catalog(db)
seed_subscriptions(db)
seed_staff(db)

app.include_router(auth.router)
app.include_router(tts.router)


@app.get("/healthz")
def healthz():
    return {"ok": True, "mock_gnani": config.USE_MOCK_GNANI,
            "stt_model": config.STT_MODEL, "tts_model": config.TTS_MODEL}


@app.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket):
    await relay.stt_relay(websocket, db.keyterms())


class CommandReq(BaseModel):
    transcript: str
    lang: str = "hinglish"


class ConfirmReq(BaseModel):
    proposal_id: str
    accept: bool
    payment_method: str = ""


_EMPTY_RESP = {"proposal_id": "", "kind": "action", "intent": "empty",
               "description": "Kuch sunai nahi diya — dobara bolo",
               "spoken": "", "confidence": 0.0, "needs_confirm": False,
               "unresolved": [], "lang": "hinglish", "noise_hint": True}


@app.post("/api/command")
def command(req: CommandReq, request: Request,
            actor: str = Depends(auth.current_actor)):
    from app.ratelimit import limiter
    ip = request.client.host if request.client else "?"
    if not limiter.hit(f"cmd:{ip}", 600):
        raise HTTPException(429, "rate limit — try tomorrow")
    if not req.transcript.strip():
        return _EMPTY_RESP
    return pipeline.command_to_proposal(req.transcript, req.lang, db)


# ------------------------------------------------ /try judge sandbox
# Public, synthetic data, resets daily, per-IP daily cap — it cannot
# burn real Gnani credits through the ledger path (parse is free; the
# STT relay does not store audio and is used live only).
_try_state: dict = {"db": None, "day": ""}


def _try_db() -> ShopDB:
    from datetime import date
    today = date.today().isoformat()
    if _try_state["day"] != today:
        if _try_state["db"] is not None:
            _try_state["db"].close()
        import pathlib
        p = pathlib.Path(config.DB_PATH).parent / "try.db"
        p.unlink(missing_ok=True)
        _try_state["db"] = ShopDB(str(p))
        _try_state["db"].seed_if_empty(seed)
        _try_state["day"] = today
    return _try_state["db"]


@app.post("/api/try/command")
def try_command(req: CommandReq, request: Request):
    from app.ratelimit import limiter
    ip = request.client.host if request.client else "?"
    if not limiter.hit(f"try:{ip}", 60):
        raise HTTPException(429, "sandbox cap reached — resets tomorrow")
    if not req.transcript.strip():
        return _EMPTY_RESP
    return pipeline.command_to_proposal(req.transcript, req.lang,
                                        _try_db())


@app.post("/api/try/confirm")
def try_confirm(req: ConfirmReq, request: Request):
    from app.ratelimit import limiter
    ip = request.client.host if request.client else "?"
    if not limiter.hit(f"try:{ip}", 60):
        raise HTTPException(429, "sandbox cap reached — resets tomorrow")
    return pipeline.confirm(req.proposal_id, req.accept, _try_db(),
                            payment_method=req.payment_method)


_STAFF_FORBIDDEN_INTENTS = {"undo", "leave_mark", "shop_config"}


@app.post("/api/confirm")
def confirm(req: ConfirmReq, actor: str = Depends(auth.current_actor)):
    intent = pipeline.peek_intent(req.proposal_id)
    if actor.startswith("staff:") and \
            intent in _STAFF_FORBIDDEN_INTENTS:
        raise HTTPException(
            403, "staff cannot apply undo/leave — owner only")
    return pipeline.confirm(req.proposal_id, req.accept, db,
                            payment_method=req.payment_method)


@app.post("/api/undo")
def undo(actor: str = Depends(auth.require_owner)):
    row = db.undo_last()
    return {"ok": True, "undone": dict(row) if row else None,
            "spoken": speak_text.done("hinglish") if row else
            "Kuch nahi tha."}


@app.get("/api/ledger")
def ledger(actor: str = Depends(auth.current_actor)):
    rows = db.recent(30)
    out = []
    for r in rows:
        d = dict(r)
        d["items"] = [dict(i) for i in db.txn_items(r["id"])]
        out.append(d)
    return {
        "recent": out,
        "balances": [{"customer_id": c["id"], "name": c["name"],
                      "balance_paise": db.balance_paise(c["id"]),
                      "trust": db.trust_scores().get(c["id"])}
                     for c in db.customers()],
        "pending": [dict(r) for r in db.pending_confirmations()],
        "shop": dict(db.conn.execute(
            "SELECT * FROM shops WHERE id=1").fetchone()),
    }


@app.get("/api/catalog")
def catalog(actor: str = Depends(auth.current_actor)):
    return {
        "products": [dict(r) for r in db.products()],
        "customers": [dict(r) for r in db.customers()],
    }


@app.get("/api/summary")
def summary(actor: str = Depends(auth.current_actor)):
    s = db.daily_summary()
    sales = sum(v["amount_paise"] for k, v in s.items()
                if k in ("sale", "credit_sale"))
    return {"by_kind": s, "total_sales_paise": sales,
            "pending": [dict(r) for r in db.pending_confirmations()]}


# ---------------------------------------------------------------- shop
@app.get("/api/shop")
def shop_info(actor: str = Depends(auth.current_actor)):
    row = db.shop_row()
    cfg = db.shop_config()
    from app.biztypes import effective_modules
    return {"name": row["name"], "business_type": row["business_type"],
            "vpa": row["vpa"], "join_code": row["join_code"],
            "config": cfg, "modules": effective_modules(cfg)}


class ShopConfigReq(BaseModel):
    business_type: str
    modules: dict = {}
    labels: dict = {}


@app.post("/api/shop/config")
def shop_config_set(req: ShopConfigReq,
                    actor: str = Depends(auth.require_owner)):
    from app.biztypes import validate_config
    ok, err = validate_config(req.business_type, req.modules,
                              req.labels)
    if not ok:
        raise HTTPException(400, err)
    db.set_shop_config(req.business_type, req.modules, req.labels)
    return {"ok": True}


@app.get("/api/join/{code}")
def join_info(code: str):
    """Public — shop name for the join page. No other data exposed."""
    shop = db.shop_by_join_code(code)
    if shop is None:
        raise HTTPException(404, "invalid join code")
    return {"shop_name": shop["name"]}


class JoinReq(BaseModel):
    name: str
    phone: str = ""
    lang_pref: str = "hinglish"
    pin: str = ""


@app.post("/api/join/{code}")
def join(code: str, req: JoinReq):
    shop = db.shop_by_join_code(code)
    if shop is None:
        raise HTTPException(404, "invalid join code")
    name = req.name.strip()[:60]
    if not name:
        raise HTTPException(400, "name required")
    out = {"ok": True, "shop_name": shop["name"]}
    if req.pin.strip():
        if not req.pin.strip().isdigit() or len(req.pin.strip()) != 4:
            raise HTTPException(400, "PIN must be exactly 4 digits")
        aid = db.account_login(name, req.pin)
        if aid is None:
            raise HTTPException(401, "name taken — wrong PIN")
        # a PIN join gets its own NEW khata row — idempotent per
        # account+shop so re-joining doesn't duplicate
        existing = db.conn.execute(
            "SELECT customer_id FROM customer_links "
            "WHERE account_id=? AND shop_id=?",
            (aid, shop["id"])).fetchone()
        if existing:
            cid = existing["customer_id"]
        else:
            cid = db.add_customer(name, phone=req.phone.strip()[:15],
                                  lang_pref=req.lang_pref)
            db.link_customer(aid, cid)
        out.update(customer_id=cid,
                   token=auth.issue_customer_token(aid),
                   account_id=aid)
    else:
        # anonymous join has no identity to dedupe on — match an existing
        # khata row by name, else create
        row = db.conn.execute(
            "SELECT id FROM customers WHERE lower(name)=lower(?) "
            "AND shop_id=?", (name, shop["id"])).fetchone()
        out["customer_id"] = row["id"] if row else db.add_customer(
            name, phone=req.phone.strip()[:15], lang_pref=req.lang_pref)
    return out


class CustLoginReq(BaseModel):
    name: str
    pin: str


@app.post("/api/me/login")
def customer_login(req: CustLoginReq):
    if not req.pin.strip().isdigit() or len(req.pin.strip()) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits")
    aid = db.account_login(req.name.strip()[:60], req.pin)
    if aid is None:
        raise HTTPException(401, "name taken — wrong PIN")
    return {"token": auth.issue_customer_token(aid),
            "account_id": aid}


@app.get("/api/me")
def customer_me(aid: int = Depends(auth.current_customer)):
    links = db.account_links(aid)
    return {"account_id": aid,
            "shops": [{"shop_name": r["shop_name"],
                       "customer_name": r["customer_name"],
                       "balance_paise": db.balance_paise(r["customer_id"])}
                      for r in links]}


@app.get("/api/me/ledger")
def customer_ledger(aid: int = Depends(auth.current_customer)):
    rows = db.account_ledger(aid)
    return {"entries": [dict(r) for r in rows]}


@app.get("/api/me/pending")
def customer_pending(aid: int = Depends(auth.current_customer)):
    rows = db.account_pending(aid)
    out = []
    for r in rows:
        items = db.txn_items(r["id"]) if hasattr(db, "txn_items") else []
        out.append({"id": r["id"], "amount_paise": r["amount_paise"],
                    "ts": r["ts"], "shop_name": r["shop_name"],
                    "confirm_token": r["confirm_token"],
                    "items": [dict(i) for i in items]})
    return {"pending": out}


@app.get("/api/me/expenses")
def customer_expenses(aid: int = Depends(auth.current_customer)):
    return db.account_expenses(aid)


# ------------------------------------------------------------- staff
class StaffLoginReq(BaseModel):
    name: str
    pin: str


@app.post("/api/staff/login")
def staff_login(req: StaffLoginReq):
    sid = db.staff_login(req.name.strip()[:40], req.pin)
    if sid is None:
        raise HTTPException(401, "wrong name or PIN")
    return {"token": auth.issue_staff_token(sid), "staff_id": sid,
            "role": "assistant"}


@app.get("/api/staff/leave")
def staff_leave(sid: int = Depends(auth.current_staff)):
    return {"leave": [dict(r) for r in db.leave_for_staff(sid)]}


class LeaveRespondReq(BaseModel):
    action: str  # 'accept' | 'dispute'


@app.post("/api/staff/leave/{leave_id}/respond")
def staff_leave_respond(leave_id: int, req: LeaveRespondReq,
                        sid: int = Depends(auth.current_staff)):
    if req.action not in ("accept", "dispute"):
        raise HTTPException(400, "action must be accept|dispute")
    if not db.leave_respond(leave_id, sid, req.action):
        raise HTTPException(404, "no pending request for you")
    return {"ok": True}


@app.get("/api/leave")
def owner_leave(actor: str = Depends(auth.require_owner)):
    out = []
    for r in db.leave_all():
        d = dict(r)
        d["events"] = [dict(e) for e in db.leave_events(r["id"])]
        out.append(d)
    return {"leave": out}


@app.get("/api/me/reminders")
def customer_reminders(aid: int = Depends(auth.current_customer)):
    rows = db.account_reminders(aid)
    out = []
    for r in rows:
        p = json.loads(r["payload"] or "{}")
        out.append({"id": r["id"], "text": p.get("note_text", ""),
                    "audio_path": f"/api/voice/{r['token']}.wav"})
    return {"reminders": out}


# ------------------------------------------------------ customer confirm
@app.get("/api/confirm/{token}")
def confirm_view(token: str):
    """Public, no login — scoped to the token (random UUID, unguessable)."""
    row = db.confirm_by_token(token)
    if row is None:
        raise HTTPException(404, "link not found")
    shop = db.conn.execute("SELECT name FROM shops WHERE id=?",
                           (row["shop_id"],)).fetchone()
    return {
        "amount_paise": row["amount_paise"],
        "customer_name": row["customer_name"],
        "shop_name": shop["name"] if shop else "",
        "state": row["confirm_state"],
        "items": [dict(i) for i in db.txn_items(row["id"])],
        "ts": row["ts"],
    }


class RespondReq(BaseModel):
    action: str  # "confirm" | "dispute"


@app.post("/api/confirm/{token}/respond")
def confirm_respond(token: str, req: RespondReq):
    if req.action not in ("confirm", "dispute"):
        raise HTTPException(400, "action must be confirm|dispute")
    state = "confirmed" if req.action == "confirm" else "disputed"
    changed = db.set_confirm_state(token, state)
    row = db.confirm_by_token(token)
    if row is None:
        raise HTTPException(404, "link not found")
    return {"ok": True, "state": row["confirm_state"], "changed": changed}


# ------------------------------------------------------------- reminders
class ReminderReq(BaseModel):
    kind: str = "restock"
    text: str = ""
    product: str = ""
    qty: float = 0.0
    due_at: float = 0.0


@app.post("/api/reminders")
def add_reminder(req: ReminderReq, actor: str = Depends(auth.current_actor)):
    rid = db.add_reminder(
        req.kind,
        {"text": req.text, "product": req.product, "qty": req.qty},
        due_at=req.due_at or None)
    return {"ok": True, "reminder_id": rid}


@app.get("/api/reminders")
def list_reminders(actor: str = Depends(auth.current_actor)):
    return {"reminders": [dict(r) for r in db.reminders()]}


@app.post("/api/reminders/{reminder_id}/done")
def reminder_done(reminder_id: int,
                  actor: str = Depends(auth.current_actor)):
    return {"ok": db.complete_reminder(reminder_id)}


# ------------------------------------------------------- voice-note page
@app.get("/api/r/{token}")
def reminder_view(token: str):
    row = db.reminder_by_token(token)
    if row is None:
        raise HTTPException(404, "link not found")
    p = json.loads(row["payload"] or "{}")
    shop = db.shop_row()
    return {"note_text": p.get("note_text") or p.get("text", ""),
            "audio_url": row["audio_path"] or "",
            "customer_name": row["customer_name"] or
            p.get("customer_name", ""),
            "shop_name": shop["name"] if shop else ""}


@app.get("/api/voice/{token}.wav")
def reminder_audio(token: str):
    from fastapi.responses import FileResponse
    import pathlib
    row = db.reminder_by_token(token)
    if row is None or not row["audio_path"]:
        raise HTTPException(404, "audio not found")
    f = pathlib.Path(config.DB_PATH).parent / "voice_notes" / f"{token}.wav"
    if not f.exists():
        raise HTTPException(404, "audio missing")
    return FileResponse(str(f), media_type="audio/wav")


@app.get("/api/weekly")
def weekly(actor: str = Depends(auth.current_actor)):
    return db.weekly_insights()


@app.get("/api/deliveries")
def deliveries(actor: str = Depends(auth.current_actor)):
    out = []
    for s in db.subscriptions():
        b = db.month_bill(s["id"])
        out.append({"id": s["id"], "customer": s["customer_name"],
                    "product": s["product"],
                    "qty_per_day": s["qty_per_day"], "unit": s["unit"],
                    "days_billed": b["days_billed"],
                    "days_skipped": b["days_skipped"],
                    "skipped": b["skipped"],
                    "month_total_paise": b["total_paise"]})
    return {"subscriptions": out}


@app.get("/api/reorder")
def reorder(actor: str = Depends(auth.current_actor)):
    from bolta.reorder import suggestions
    return {"suggestions": suggestions(db, days=14)}


@app.get("/api/upi")
def upi_link(amount_paise: int, actor: str = Depends(auth.current_actor)):
    shop = db.conn.execute("SELECT vpa,name FROM shops WHERE id=1").fetchone()
    vpa = shop["vpa"] or config.SHOP_VPA
    rupees = amount_paise / 100
    return {"upi": f"upi://pay?pa={vpa}&pn={shop['name']}"
                   f"&am={rupees:.2f}&cu=INR",
            "self_reported": True}


# ---------------------------------------------------- single-URL deploy
# When behind one public tunnel (ngrok free), the backend proxies page
# traffic to the Next server so a single HTTPS URL serves everything.
_FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN",
                                  "http://localhost:3000")


@app.api_route("/{full_path:path}",
               methods=["GET", "HEAD"], include_in_schema=False)
async def ui_proxy(full_path: str):
    import httpx
    from fastapi.responses import Response
    async with httpx.AsyncClient(base_url=_FRONTEND_ORIGIN,
                                 timeout=30.0,
                                 follow_redirects=True) as client:
        try:
            r = await client.get("/" + full_path)
        except httpx.HTTPError as e:
            raise HTTPException(502, f"frontend unreachable: {e}")
    hop = {"transfer-encoding", "connection", "content-encoding",
           "content-length"}
    headers = {k: v for k, v in r.headers.items()
               if k.lower() not in hop}
    return Response(content=r.content, status_code=r.status_code,
                    headers=headers)
