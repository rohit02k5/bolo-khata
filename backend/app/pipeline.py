"""Transcript -> proposal dispatcher.

Bill-shaped transcripts go through bill_parse (multi-item); everything
else falls through to the vendored bolta parser (single intents, queries,
undo, restock). Proposals are held in memory keyed by id — the write
only happens on /api/confirm.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import asdict
from typing import Any

from bolta.actions import apply as apply_action
from bolta.actions import propose as propose_action
from bolta.parse import parse
from bolta.say import say_amount, say_hi, say_hinglish

from app.bill_parse import Bill, parse_bill
from app import config, speak_text

_pending: dict[str, dict[str, Any]] = {}
_TTL = 300  # seconds — proposals die if not confirmed


def _gc() -> None:
    now = time.time()
    for k in [k for k, v in _pending.items() if now - v["ts"] > _TTL]:
        _pending.pop(k, None)


def _stash(kind: str, obj: Any, transcript: str, lang: str) -> str:
    _gc()
    pid = uuid.uuid4().hex[:16]
    _pending[pid] = {"kind": kind, "obj": obj, "transcript": transcript,
                     "lang": lang, "ts": time.time()}
    return pid


def _bill_spoken(bill: Bill, lang: str) -> str:
    n = len(bill.items)
    amt = bill.total_paise
    cust = bill.customer_name or bill.customer
    if lang == "hi":
        words = say_hi(amt // 100)
        who = f"{cust} के खाते में " if cust else ""
        return f"{who}{n} चीज़ें, कुल {words} रुपये। सही है?"
    if lang == "te":
        who = f"{cust} ఖాతాలో " if cust else ""
        return f"{who}{n} వస్తువులు, మొత్తం {amt // 100} రూపాయలు. సరియేనా?"
    if lang == "en":
        who = f"for {cust} " if cust else ""
        return (f"{n} items {who}on khata, total "
                f"{amt // 100} rupees. Confirm?")
    words = say_hinglish(amt // 100)
    who = f"{cust} ke khate mein " if cust else ""
    return f"{who}{n} cheezein, total {words} rupaye. Sahi hai?"


def _bill_desc(bill: Bill) -> str:
    lines = [f"{i.qty:g} {i.unit} {i.product_name or i.name}"
             f" — ₹{i.line_total_paise // 100}" for i in bill.items]
    who = f" ({bill.customer_name or bill.customer})" \
        if (bill.customer_name or bill.customer) else ""
    return "; ".join(lines) + f" = ₹{bill.total_paise // 100}{who}"


def command_to_proposal(transcript: str, lang: str, db) -> dict:
    """Returns a JSON-safe proposal dict (with proposal_id)."""
    bill = parse_bill(transcript, db)
    if bill.intent == "add_bill" and bill.items:
        pid = _stash("bill", bill, transcript, lang)
        return {
            "proposal_id": pid, "kind": "bill", "intent": "add_bill",
            "description": _bill_desc(bill),
            "spoken": _bill_spoken(bill, lang),
            "confidence": bill.confidence,
            "needs_confirm": True,
            "items": [asdict(i) for i in bill.items],
            "customer_id": bill.customer_id,
            "customer_name": bill.customer_name or bill.customer,
            "customer_options": bill.customer_options,
            "total_paise": bill.total_paise,
            "unresolved": bill.unresolved,
            "lang": lang,
        }

    cmd = parse(transcript, lang)
    if cmd.intent == "deny":
        # standalone voice "nahi/galat/cancel" -> undo (confirm UI is tap)
        cmd.intent = "undo"
    prop = propose_action(cmd, db)
    pid = _stash("action", prop, transcript, lang)
    spoken = prop.speak("hi" if lang == "hi" else "hinglish")
    if lang == "te":
        spoken = speak_text.for_action(prop, "te")
    return {
        "proposal_id": pid, "kind": "action", "intent": prop.intent,
        "description": prop.description,
        "spoken": spoken,
        "confidence": prop.confidence,
        "needs_confirm": prop.needs_confirm or prop.intent == "undo",
        "error": prop.error,
        "unresolved": [],
        "lang": lang,
    }


def confirm(proposal_id: str, accept: bool, db, *,
            payment_method: str = "") -> dict:
    """Apply (or drop) a stashed proposal. Returns write result."""
    entry = _pending.pop(proposal_id, None)
    if entry is None:
        return {"ok": False, "error": "proposal expired — bolo phir se"}
    if not accept:
        return {"ok": True, "written": False,
                "spoken": speak_text.deny(entry["lang"])}

    lang = entry["lang"]
    if entry["kind"] == "bill":
        bill: Bill = entry["obj"]
        method = payment_method or ("khata" if bill.customer_id else "cash")
        credit = method == "khata"
        tid, token = db.record_bill(
            [{"product_id": i.product_id, "name": i.product_name or i.name,
              "qty": i.qty, "unit": i.unit,
              "unit_price_paise": i.unit_price_paise}
             for i in bill.items],
            customer_id=bill.customer_id, payment_method=method,
            credit=credit, source="voice", transcript=entry["transcript"],
            stt_confidence=bill.confidence,
            idempotency_key=f"bill:{proposal_id}")
        out = {"ok": True, "written": True, "txn_id": tid,
               "confirm_token": token,
               "confirm_path": f"/c/{token}" if token else "",
               "spoken": speak_text.done(lang)}
        if bill.customer_id:
            out["balance_paise"] = db.balance_paise(bill.customer_id)
        return out

    prop = entry["obj"]
    aid = db.propose({"transcript": entry["transcript"],
                      "intent": prop.intent})
    tid = apply_action(prop, db, transcript=entry["transcript"],
                       audit_id=aid)
    return {"ok": True, "written": True, "txn_id": tid,
            "spoken": speak_text.done(lang)}
