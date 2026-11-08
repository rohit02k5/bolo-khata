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
    s = db.daily_summary()
    sales = sum(v["amount_paise"] for k, v in s.items()
                if k in ("sale", "credit_sale"))
    return {"by_kind": s, "total_sales_paise": sales,
            "pending": [dict(r) for r in db.pending_confirmations()]}


# ---------------------------------------------------------------- shop
@app.get("/api/shop")
def shop_info(actor: str = Depends(auth.current_actor)):
    row = db.shop_row()
    return {"name": row["name"], "business_type": row["business_type"],
            "vpa": row["vpa"], "join_code": row["join_code"]}


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


@app.post("/api/join/{code}")
def join(code: str, req: JoinReq):
    shop = db.shop_by_join_code(code)
    if shop is None:
        raise HTTPException(404, "invalid join code")
    name = req.name.strip()[:60]
    if not name:
        raise HTTPException(400, "name required")
    cid = db.add_customer(name, phone=req.phone.strip()[:15],
                          lang_pref=req.lang_pref)
    return {"ok": True, "customer_id": cid,
            "shop_name": shop["name"]}


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
