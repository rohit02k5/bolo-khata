"""Bolo Khata backend — FastAPI app.

Routes: health, auth (signup/session/login), WS STT relay, command
proposals, bill editing, confirm writes, ledger/stock queries, public
customer-confirmation endpoint, reminders, TTS proxy.

Every authenticated route resolves its shop from the bearer token —
data is scoped per shop. All writes are idempotent where a client
supplies a key.
"""

from __future__ import annotations

import json
import logging
import os
import re

import app.bootstrap  # noqa: F401  (vendor path + dotenv, import first)
from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app import auth, config, pipeline, relay, speak_text, tts
from app.db import ShopDB
from app.seed import PRODUCTS, seed

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Bolo Khata", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"], allow_headers=["*"], allow_credentials=True)

# ------------------------------------------------------------- db cache
# One ShopDB per shop_id — each binds its queries to that shop.
_dbs: dict[int, ShopDB] = {}


def get_db(shop_id: int = 1) -> ShopDB:
    if shop_id not in _dbs:
        _dbs[shop_id] = ShopDB(config.DB_PATH, shop_id)
    return _dbs[shop_id]


db = get_db(1)
db.seed_if_empty(seed)
# idempotent backfills for pre-existing DBs (new aliases, subscriptions)
from app.seed import sync_catalog, seed_subscriptions, seed_staff
sync_catalog(db)
seed_subscriptions(db)
seed_staff(db)

app.include_router(auth.router)
app.include_router(tts.router)


def _adb(pair: tuple[str, int]) -> tuple[str, ShopDB]:
    """(actor, shop_id) -> (actor, bound db). 409 if no shop yet."""
    actor, shop_id = pair
    if not shop_id:
        raise HTTPException(409, "finish shop setup first")
    return actor, get_db(shop_id)


@app.get("/healthz")
def healthz():
    return {"ok": True, "mock_gnani": config.USE_MOCK_GNANI,
            "stt_model": config.STT_MODEL, "tts_model": config.TTS_MODEL}


@app.websocket("/ws/stt")
async def ws_stt(websocket: WebSocket, shop: int = 1):
    await relay.stt_relay(websocket, get_db(shop).keyterms())


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
            pair: tuple = Depends(auth.actor_shop)):
    from app.ratelimit import limiter
    ip = request.client.host if request.client else "?"
    if not limiter.hit(f"cmd:{ip}", 600):
        raise HTTPException(429, "rate limit — try tomorrow")
    if not req.transcript.strip():
        return _EMPTY_RESP
    _, sdb = _adb(pair)
    return pipeline.command_to_proposal(req.transcript, req.lang, sdb)


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
def confirm(req: ConfirmReq, pair: tuple = Depends(auth.actor_shop)):
    actor, _ = pair
    intent = pipeline.peek_intent(req.proposal_id)
    if actor.startswith("staff:") and \
            intent in _STAFF_FORBIDDEN_INTENTS:
        raise HTTPException(
            403, "staff cannot apply undo/leave — owner only")
    _, sdb = _adb(pair)
    return pipeline.confirm(req.proposal_id, req.accept, sdb,
                            payment_method=req.payment_method)


@app.post("/api/undo")
def undo(pair: tuple = Depends(auth.require_owner_shop)):
    _, sdb = _adb(pair)
    row = sdb.undo_last()
    return {"ok": True, "undone": dict(row) if row else None,
            "spoken": speak_text.done("hinglish") if row else
            "Kuch nahi tha."}


@app.get("/api/ledger")
def ledger(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    rows = sdb.recent(30)
    out = []
    for r in rows:
        d = dict(r)
        d["items"] = [dict(i) for i in sdb.txn_items(r["id"])]
        out.append(d)
    return {
        "recent": out,
        "balances": [{"customer_id": c["id"], "name": c["name"],
                      "balance_paise": sdb.balance_paise(c["id"]),
                      "trust": sdb.trust_scores().get(c["id"])}
                     for c in sdb.customers()],
        "pending": [dict(r) for r in sdb.pending_confirmations()],
        "shop": dict(sdb.shop_row()) if sdb.shop_row() else {},
    }


@app.get("/api/catalog")
def catalog(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    return {
        "products": [dict(r) for r in sdb.products()],
        "customers": [dict(r) for r in sdb.customers()],
    }


@app.get("/api/summary")
def summary(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    s = sdb.daily_summary()
    sales = sum(v["amount_paise"] for k, v in s.items()
                if k in ("sale", "credit_sale"))
    return {"by_kind": s, "total_sales_paise": sales,
            "pending": [dict(r) for r in sdb.pending_confirmations()]}


# ---------------------------------------------------------------- shop
@app.get("/api/shop")
def shop_info(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    row = sdb.shop_row()
    cfg = sdb.shop_config()
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
                    pair: tuple = Depends(auth.require_owner_shop)):
    from app.biztypes import validate_config
    ok, err = validate_config(req.business_type, req.modules,
                              req.labels)
    if not ok:
        raise HTTPException(400, err)
    _, sdb = _adb(pair)
    sdb.set_shop_config(req.business_type, req.modules, req.labels)
    return {"ok": True}


# ============================================================ accounts
def _check_password_rules(pw: str) -> None:
    if len(pw) < 8:
        raise HTTPException(400, "password must be at least 8 characters")
    if not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        raise HTTPException(400, "password needs a letter and a digit")


class SignupReq(BaseModel):
    email: str
    password: str
    name: str = ""


@app.post("/api/signup")
def signup(req: SignupReq):
    """Owner signup — creates the account; shop comes from onboarding."""
    email = req.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "valid email required")
    _check_password_rules(req.password)
    if db.user_by_email(email):
        raise HTTPException(409, "email already registered — log in")
    uid = db.create_user(email, req.password, req.name, role="owner")
    return {"token": auth.issue_token(f"owner:{uid}", 0),
            "role": "owner", "shop_id": 0, "needs_onboarding": True}


class SessionLoginReq(BaseModel):
    email: str
    password: str


@app.post("/api/session/login")
def session_login(req: SessionLoginReq):
    row = db.user_by_email(req.email)
    if row is None or not db.check_user_password(row, req.password):
        raise HTTPException(401, "wrong email or password")
    sid = row["shop_id"] or 0
    return {"token": auth.issue_token(f"owner:{row['id']}", sid),
            "role": row["role"], "shop_id": sid,
            "needs_onboarding": not sid}


@app.get("/api/session")
def session_info(pair: tuple = Depends(auth.actor_shop)):
    actor, shop_id = pair
    role = ("staff" if actor.startswith("staff:") else
            "customer" if actor.startswith("cust:") else "owner")
    out = {"actor": actor, "role": role, "shop_id": shop_id,
           "needs_onboarding": not shop_id}
    if shop_id:
        row = get_db(shop_id).shop_by_id(shop_id)
        if row:
            out["shop_name"] = row["name"]
    return out


# ------------------------------------------------------- shop setup
_STARTER = {
    "kirana": None,     # None -> the full PRODUCTS starter list
    "milk": ["Doodh", "Dahi", "Ghee"],
    "newspaper": ["Akhbar"],
    "fruit_veg": ["Aloo", "Pyaaz", "Tamatar", "Kela"],
    "other": None,
}
# starter rows for types whose items aren't in the kirana catalog
_EXTRA_PRODUCTS = {
    "Aloo": ("Aloo", "आलू", "బంగాళాదుంప", "aloo,potato,alu,ఆలూ",
             "kg", 1, 20, 8, 4000),
    "Pyaaz": ("Pyaaz", "प्याज़", "ఉల్లిపాయ", "pyaaz,onion,pyaz,ఉల్లి",
              "kg", 1, 20, 8, 5000),
    "Tamatar": ("Tamatar", "टमाटर", "టమాటా", "tamatar,tomato,టమాట",
                "kg", 1, 15, 6, 6000),
    "Kela": ("Kela", "केला", "అరటిపండు", "kela,banana,అరటి",
             "dozen", 1, 10, 4, 6000),
}


class ShopSetupReq(BaseModel):
    name: str
    business_type: str = "kirana"
    vpa: str = ""
    city: str = ""
    modules: dict = {}
    labels: dict = {}
    starter: bool = True
    catalog: list[dict] = []   # owner-edited starter rows


@app.post("/api/shop/setup")
def shop_setup(req: ShopSetupReq,
               pair: tuple = Depends(auth.actor_shop)):
    """Onboarding: create the shop, set business type, seed the starter
    catalog. Only for owners who do not yet have a shop."""
    actor, shop_id = pair
    if not actor.startswith("owner"):
        raise HTTPException(403, "owner-only action")
    if shop_id:
        raise HTTPException(409, "shop already set up")
    from app.biztypes import BUSINESS_TYPES, validate_config
    if req.business_type not in BUSINESS_TYPES:
        raise HTTPException(400, "unknown business type")
    ok, err = validate_config(req.business_type, req.modules or {},
                              req.labels or {})
    if not ok:
        raise HTTPException(400, err)
    if not req.name.strip():
        raise HTTPException(400, "shop name required")

    new_id = db.create_shop(req.name, req.business_type, req.vpa)
    sdb = get_db(new_id)
    sdb.set_shop_config(req.business_type, req.modules or {},
                        req.labels or {})
    if req.city:
        sdb.conn.execute(
            "UPDATE shops SET name=? WHERE id=?",
            (f"{req.name.strip()[:60]} · {req.city.strip()[:40]}",
             new_id))
        sdb.conn.commit()

    if req.catalog:
        for c in req.catalog[:200]:
            sdb.add_product(
                str(c.get("name_en", ""))[:60] or "Item",
                str(c.get("name_hi", ""))[:60],
                str(c.get("name_te", ""))[:60],
                aliases=str(c.get("aliases", ""))[:200],
                unit=str(c.get("unit", "piece"))[:20],
                price_paise=int(c.get("price_paise", 0)),
                stock=float(c.get("stock", 0)))
    elif req.starter:
        wanted = _STARTER.get(req.business_type)
        by_name = {p[0]: p for p in PRODUCTS}
        by_name.update(_EXTRA_PRODUCTS)
        names = wanted or [p[0] for p in PRODUCTS]
        for n in names:
            p = by_name.get(n)
            if p:
                (en, hi, te, aliases, unit, pack, stock, rp, price) = p[:9]
                sdb.add_product(en, hi, te, aliases=aliases, unit=unit,
                                pack_size=pack, price_paise=price,
                                stock=stock, reorder_point=rp)
    # link the owner account (owner:{uid} tokens) to the new shop
    if actor.startswith("owner:"):
        db.set_user_shop(int(actor.split(":", 1)[1]), new_id)
    row = sdb.shop_row()
    return {"ok": True, "shop_id": new_id, "name": row["name"],
            "join_code": row["join_code"],
            "business_type": row["business_type"],
            "token": auth.issue_token(actor, new_id)}


@app.get("/api/join/{code}")
def join_info(code: str):
    """Public — shop name + type for the join page. Nothing else."""
    shop = db.shop_by_join_code(code)
    if shop is None:
        raise HTTPException(404, "invalid join code")
    return {"shop_name": shop["name"],
            "business_type": shop["business_type"]}


class JoinReq(BaseModel):
    name: str
    phone: str = ""
    lang_pref: str = "hinglish"
    pin: str = ""
    contact: str = ""


@app.post("/api/join/{code}")
def join(code: str, req: JoinReq):
    shop = db.shop_by_join_code(code)
    if shop is None:
        raise HTTPException(404, "invalid join code")
    sdb = db.for_shop(shop["id"])
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
            cid = sdb.add_customer(name, phone=req.phone.strip()[:15],
                                   lang_pref=req.lang_pref)
            sdb.link_customer(aid, cid)
        out.update(customer_id=cid,
                   token=auth.issue_customer_token(aid),
                   account_id=aid)
    else:
        # anonymous join has no identity to dedupe on — match an existing
        # khata row by name, else create
        row = db.conn.execute(
            "SELECT id FROM customers WHERE lower(name)=lower(?) "
            "AND shop_id=?", (name, shop["id"])).fetchone()
        out["customer_id"] = row["id"] if row else sdb.add_customer(
            name, phone=req.phone.strip()[:15], lang_pref=req.lang_pref)
    return out


class CustSignupReq(BaseModel):
    name: str
    pin: str
    contact: str = ""     # email or phone — optional recovery hint
    join_code: str = ""   # join a shop in the same step


@app.post("/api/me/signup")
def customer_signup(req: CustSignupReq):
    name = req.name.strip()[:60]
    if not name:
        raise HTTPException(400, "name required")
    if not req.pin.strip().isdigit() or len(req.pin.strip()) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits")
    aid = db.account_signup(name, req.pin, req.contact)
    if aid is None:
        raise HTTPException(409, "name taken — log in instead")
    out = {"token": auth.issue_customer_token(aid), "account_id": aid}
    if req.join_code.strip():
        shop = db.shop_by_join_code(req.join_code.strip())
        if shop is not None:
            sdb = db.for_shop(shop["id"])
            cid = sdb.add_customer(name, lang_pref="hinglish")
            sdb.link_customer(aid, cid)
            out.update(customer_id=cid, shop_name=shop["name"])
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


def _staff_login_global(name: str, pin: str) -> tuple[int, int] | None:
    """Staff are shop-scoped but login is name+PIN only — check every
    matching staff row, return (staff_id, shop_id)."""
    rows = db.conn.execute(
        "SELECT id,name,pin_hash,shop_id FROM staff WHERE name=? "
        "AND active=1 AND pin_hash != ''",
        (name.strip(),)).fetchall()
    for r in rows:
        if __import__("secrets").compare_digest(
                db._pin_hash(r["name"], pin), r["pin_hash"]):
            return r["id"], r["shop_id"]
    return None


@app.post("/api/staff/login")
def staff_login(req: StaffLoginReq):
    hit = _staff_login_global(req.name.strip()[:40], req.pin)
    if hit is None:
        raise HTTPException(401, "wrong name or PIN")
    sid, shop_id = hit
    return {"token": auth.issue_staff_token(sid, shop_id),
            "staff_id": sid, "role": "assistant", "shop_id": shop_id}


class StaffInviteReq(BaseModel):
    name: str


@app.post("/api/staff/invite")
def staff_invite(req: StaffInviteReq,
                 pair: tuple = Depends(auth.require_owner_shop)):
    _, sdb = _adb(pair)
    if not req.name.strip():
        raise HTTPException(400, "staff name required")
    return {"ok": True, "name": req.name.strip()[:60],
            "invite_code": sdb.create_staff_invite(req.name)}


class StaffRegisterReq(BaseModel):
    invite_code: str
    pin: str


@app.post("/api/staff/register")
def staff_register(req: StaffRegisterReq):
    if not req.pin.strip().isdigit() or len(req.pin.strip()) != 4:
        raise HTTPException(400, "PIN must be exactly 4 digits")
    row = db.staff_by_invite(req.invite_code)
    if row is None:
        raise HTTPException(404, "invalid or used invite code")
    sdb = db.for_shop(row["shop_id"])
    sdb.staff_set_pin(row["id"], req.pin)
    return {"token": auth.issue_staff_token(row["id"], row["shop_id"]),
            "staff_id": row["id"], "role": "assistant",
            "shop_id": row["shop_id"], "name": row["name"]}


@app.get("/api/staff/leave")
def staff_leave(pair: tuple = Depends(auth.actor_shop)):
    actor, shop_id = pair
    if not actor.startswith("staff:"):
        raise HTTPException(401, "staff login required")
    sid = int(actor.split(":", 1)[1])
    return {"leave": [dict(r) for r in
                      get_db(shop_id).leave_for_staff(sid)]}


class LeaveRespondReq(BaseModel):
    action: str  # 'accept' | 'dispute'


@app.post("/api/staff/leave/{leave_id}/respond")
def staff_leave_respond(leave_id: int, req: LeaveRespondReq,
                        pair: tuple = Depends(auth.actor_shop)):
    actor, shop_id = pair
    if not actor.startswith("staff:"):
        raise HTTPException(401, "staff login required")
    sid = int(actor.split(":", 1)[1])
    if req.action not in ("accept", "dispute"):
        raise HTTPException(400, "action must be accept|dispute")
    if not get_db(shop_id).leave_respond(leave_id, sid, req.action):
        raise HTTPException(404, "no pending request for you")
    return {"ok": True}


@app.get("/api/leave")
def owner_leave(pair: tuple = Depends(auth.require_owner_shop)):
    _, sdb = _adb(pair)
    out = []
    for r in sdb.leave_all():
        d = dict(r)
        d["events"] = [dict(e) for e in sdb.leave_events(r["id"])]
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


# ======================================================= bill editing
class BillItemEdit(BaseModel):
    product_id: int | None = None
    name: str = ""
    qty: float = 1.0
    unit: str = "piece"
    unit_price_paise: int | None = None   # owner-only override


class BillEditReq(BaseModel):
    items: list[BillItemEdit]
    customer_id: int | None = None
    customer_name: str = ""
    lang: str = "hinglish"
    transcript: str = ""


@app.post("/api/bill/edit")
def bill_edit(req: BillEditReq,
              pair: tuple = Depends(auth.actor_shop)):
    """Re-stash an edited bill: server re-validates every line against
    the catalog, recomputes totals in integer paise, and returns a fresh
    proposal. Staff can edit items/qty but never prices."""
    actor, _ = pair
    _, sdb = _adb(pair)
    is_owner = actor.startswith("owner")
    prop = pipeline.edit_bill(
        [i.model_dump() for i in req.items], sdb,
        customer_id=req.customer_id,
        customer_name=req.customer_name, lang=req.lang,
        transcript=req.transcript, allow_price_override=is_owner)
    if prop is None:
        raise HTTPException(400, "bill has no items left")
    return prop


# ------------------------------------------------- catalog quick-add
class ProductReq(BaseModel):
    name_en: str
    name_hi: str = ""
    name_te: str = ""
    aliases: str = ""
    unit: str = "piece"
    price_paise: int = 0
    stock: float = 0.0


@app.post("/api/products")
def add_product(req: ProductReq,
                pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    if not req.name_en.strip():
        raise HTTPException(400, "name required")
    pid = sdb.add_product(req.name_en.strip()[:60],
                          req.name_hi.strip()[:60],
                          req.name_te.strip()[:60],
                          aliases=req.aliases.strip()[:200],
                          unit=req.unit[:20] or "piece",
                          price_paise=max(0, req.price_paise),
                          stock=max(0.0, req.stock))
    row = sdb.conn.execute("SELECT * FROM products WHERE id=?",
                           (pid,)).fetchone()
    return {"ok": True, "product": dict(row)}


@app.patch("/api/products/{product_id}")
def edit_product(product_id: int, req: ProductReq,
                 pair: tuple = Depends(auth.require_owner_shop)):
    _, sdb = _adb(pair)
    ok = sdb.update_product(product_id, name_en=req.name_en.strip()[:60],
                            price_paise=max(0, req.price_paise),
                            stock=max(0.0, req.stock),
                            unit=req.unit[:20] or None)
    if not ok:
        raise HTTPException(404, "product not found")
    return {"ok": True}


class CustomerReq(BaseModel):
    name: str
    phone: str = ""
    lang_pref: str = "hinglish"


@app.post("/api/customers")
def add_customer(req: CustomerReq,
                 pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    name = req.name.strip()[:60]
    if not name:
        raise HTTPException(400, "name required")
    existing = sdb.customer_by_name(name)
    if existing:
        return {"ok": True, "customer": dict(existing),
                "existed": True}
    cid = sdb.add_customer(name, phone=req.phone.strip()[:15],
                           lang_pref=req.lang_pref)
    row = sdb.conn.execute("SELECT * FROM customers WHERE id=?",
                           (cid,)).fetchone()
    return {"ok": True, "customer": dict(row)}


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
def add_reminder(req: ReminderReq,
                 pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    rid = sdb.add_reminder(
        req.kind,
        {"text": req.text, "product": req.product, "qty": req.qty},
        due_at=req.due_at or None)
    return {"ok": True, "reminder_id": rid}


@app.get("/api/reminders")
def list_reminders(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    return {"reminders": [dict(r) for r in sdb.reminders()]}


@app.post("/api/reminders/{reminder_id}/done")
def reminder_done(reminder_id: int,
                  pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    return {"ok": sdb.complete_reminder(reminder_id)}


# ------------------------------------------------------- voice-note page
@app.get("/api/r/{token}")
def reminder_view(token: str):
    row = db.reminder_by_token(token)
    if row is None:
        raise HTTPException(404, "link not found")
    p = json.loads(row["payload"] or "{}")
    shop = db.shop_by_id(row["shop_id"])
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
def weekly(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    return sdb.weekly_insights()


@app.get("/api/deliveries")
def deliveries(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    out = []
    for s in sdb.subscriptions():
        b = sdb.month_bill(s["id"])
        out.append({"id": s["id"], "customer": s["customer_name"],
                    "product": s["product"],
                    "qty_per_day": s["qty_per_day"], "unit": s["unit"],
                    "days_billed": b["days_billed"],
                    "days_skipped": b["days_skipped"],
                    "skipped": b["skipped"],
                    "month_total_paise": b["total_paise"]})
    return {"subscriptions": out}


@app.get("/api/reorder")
def reorder(pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    from bolta.reorder import suggestions
    return {"suggestions": suggestions(sdb, days=14)}


@app.get("/api/upi")
def upi_link(amount_paise: int,
             pair: tuple = Depends(auth.actor_shop)):
    _, sdb = _adb(pair)
    shop = sdb.shop_row()
    vpa = (shop["vpa"] if shop else "") or config.SHOP_VPA
    rupees = amount_paise / 100
    return {"upi": f"upi://pay?pa={vpa}&pn={shop['name'] if shop else 'Bolo Khata'}"
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
