"""Bolo Khata backend — FastAPI app.

Routes: health, auth, WS STT relay, command proposals, confirm writes,
ledger/stock queries, public customer-confirmation endpoint, reminders,
TTS proxy. All writes are idempotent where a client supplies a key.
"""

from __future__ import annotations

import logging
import os

import app.bootstrap  # noqa: F401  (vendor path + dotenv, import first)
from fastapi import Depends, FastAPI, HTTPException, WebSocket
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


@app.post("/api/command")
def command(req: CommandReq, actor: str = Depends(auth.current_actor)):
    return pipeline.command_to_proposal(req.transcript, req.lang, db)


@app.post("/api/confirm")
def confirm(req: ConfirmReq, actor: str = Depends(auth.current_actor)):
    return pipeline.confirm(req.proposal_id, req.accept, db,
                            payment_method=req.payment_method)


@app.post("/api/undo")
def undo(actor: str = Depends(auth.current_actor)):
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
                      "balance_paise": db.balance_paise(c["id"])}
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
    return db.daily_summary()


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
    import json as _json
    db.conn.execute(
        "INSERT INTO reminders (shop_id,kind,payload,due_at) "
        "VALUES (?,?,?,?)",
        (1, req.kind, _json.dumps(
            {"text": req.text, "product": req.product, "qty": req.qty},
            ensure_ascii=False), req.due_at or None))
    db.conn.commit()
    return {"ok": True}


@app.get("/api/reminders")
def list_reminders(actor: str = Depends(auth.current_actor)):
    rows = db.conn.execute(
        "SELECT * FROM reminders WHERE shop_id=1 AND done=0 "
        "ORDER BY id DESC").fetchall()
    return {"reminders": [dict(r) for r in rows]}


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
