"""Transcript -> proposal dispatcher.

Bill-shaped transcripts go through bill_parse (multi-item); everything
else falls through to the vendored bolta parser (single intents, queries,
undo, restock). Proposals are held in memory keyed by id — the write
only happens on /api/confirm.
"""

from __future__ import annotations

import json
import time
import uuid
from dataclasses import asdict
from typing import Any

from bolta.actions import apply as apply_action
from bolta.actions import propose as propose_action
from bolta.parse import parse
from bolta.say import say_amount, say_hi, say_hinglish

from app.bill_parse import Bill, parse_bill, _find_customer
from bolta.parse import STOPWORDS
from bolta.resolve import _match
import re as _re
_NUM = _re.compile(r"^\d+(?:\.\d+)?$")
from noiselab.normalize import canonical
from app import config, speak_text

_pending: dict[str, dict[str, Any]] = {}
_TTL = 300  # seconds — proposals die if not confirmed


def _gc() -> None:
    now = time.time()
    for k in [k for k, v in _pending.items() if now - v["ts"] > _TTL]:
        _pending.pop(k, None)


def peek_intent(proposal_id: str) -> str | None:
    """Read a stashed proposal's intent without consuming it — used for
    server-side role gates (staff cannot apply undo/leave writes)."""
    entry = _pending.get(proposal_id)
    if entry is None:
        return None
    if entry["kind"] == "action":
        return getattr(entry["obj"], "intent", None)
    return entry["kind"]


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


def _voice_note_text(p: dict, lang: str, db) -> str:
    """Template reminder — amount from the DB, never invented."""
    name = p.get("customer_name") or "customer"
    shop = db.shop_row()["name"] if hasattr(db, "shop_row") else "dukaan"
    bal = db.balance_paise(p["customer_id"]) if p.get("customer_id") else 0
    amt = bal // 100
    if lang == "te":
        return (f"నమస్తే {name} గారూ, {shop} నుండి గుర్తు చేస్తున్నాం — "
                f"మీ బాకీ {amt} రూపాయలు ఉంది. ధన్యవాదాలు.")
    if lang == "en":
        return (f"Namaste {name} ji, a reminder from {shop} — "
                f"your balance of {amt} rupees is pending. Thank you.")
    return (f"Namaste {name} ji, {shop} se yaad dila rahe hain — "
            f"aapka {amt} rupaye ka udhaar baaki hai. Shukriya.")


def inr_words(paise: int) -> str:
    return say_hinglish(paise // 100) + " rupaye"


def _bill_desc(bill: Bill) -> str:
    lines = [f"{i.qty:g} {i.unit} {i.product_name or i.name}"
             f" — ₹{i.line_total_paise // 100}" for i in bill.items]
    who = f" ({bill.customer_name or bill.customer})" \
        if (bill.customer_name or bill.customer) else ""
    return "; ".join(lines) + f" = ₹{bill.total_paise // 100}{who}"


# ----------------------------------------------------------- extra intents
_RESTOCK_HINTS = ("next time", "agli baar", "list mein", "list me",
                  "checklist", "note kar", "note kar lo", "yaad rakh",
                  "mangwana", "order karna", "లిస్ట్", "ఆర్డర్")
_VOICE_NOTE_HINTS = ("yaad dilao", "yaad dilana", "yaad dila", "remind karo",
                     "reminder bhejo", "reminder bhej", "యాదు చేయి",
                     "గుర్తు చేయి")
_STOCK_OUT_HINTS = ("kharab", "nikala", "nikaal", "nikal diya", "damage",
                    "expired", "expire", "ghatao", "kam kar do",
                    "stock kam", "फट गया", "खराब", "చెడిపోయిన")
_SUMMARY_HINTS = ("aaj ka hisaab", "aaj ka hisab", "aaj ki sale",
                  "aaj kitna", "aaj ka sale", "today sale", "hisaab batao",
                  "hisab batao", "ఈరోజు")
_WEEKLY_HINTS = ("is hafte", "hafte ka hisaab", "hafte mein", "weekly",
                 "is week", "saat din", "ఈ వారం", "వారం హిసాబ్")
_HINT_WORDS = {"next", "time", "agli", "baar", "list", "mein", "me",
               "checklist", "note", "kar", "lo", "yaad", "rakh",
               "mangwana", "hai", "order", "karna", "dilao", "dilana",
               "dila", "remind", "karo", "reminder", "bhejo", "bhej",
               "kharab", "ho", "gayi", "gaya"}


def _non_hint_items(canon: str):
    from app.bill_parse import _segments, _parse_item
    items = []
    for c in _segments(canon.split()):
        it = _parse_item(c)
        if it is None:
            continue
        if all(w in _HINT_WORDS or w in STOPWORDS for w in it.name.split()):
            continue
        items.append(it)
    return items


def _cust_before(tokens: list[str], marker_idx: int):
    """'<name> ko yaad dilao' -> name is the token before 'ko'."""
    if marker_idx >= 1:
        t = tokens[marker_idx - 1]
        if not _NUM.match(t) and t not in STOPWORDS and t not in _HINT_WORDS:
            return t
    return ""


_SKIP_HINTS = ("nahi chahiye", "band", "rok do", "rokna", "mat la",
               "mat dena", "mat do", "skip", "cancel", "వద్దు", "వద్దులే")
_MONTH_BILL_HINTS = ("mahine ka bill", "is mahine", "month ka bill",
                     "monthly bill", "bill batao", "bill banao",
                     "మాసం బిల్లు", "నెల బిల్లు")


def _sub_product_names(db, sub) -> set[str]:
    prow = db.conn.execute(
        "SELECT * FROM products WHERE id=?",
        (sub["product_id"],)).fetchone()
    names = {sub["product"].lower()}
    for a in (prow["aliases"] or "").split(","):
        a = a.strip().lower()
        if a:
            names.add(a)
    return names


def _resolve_delivery_subs(db, canon: str) -> list:
    """Subscriptions a transcript refers to: product word first, then
    customer name to narrow."""
    subs = db.subscriptions()
    hits = [s for s in subs
            if any(n in canon for n in _sub_product_names(db, s))]
    cust, _ = _find_customer(canon.split())
    cid = None
    if cust:
        row, *_ = _match(cust, db.customers())
        if row is not None:
            cid = row["id"]
    else:
        named = [s for s in subs
                 if s["customer_name"].lower() in canon]
        if len({s["customer_id"] for s in named}) == 1:
            cid = named[0]["customer_id"]
    if cid is not None:
        if hits:
            hits = [s for s in hits if s["customer_id"] == cid]
        else:
            hits = [s for s in subs if s["customer_id"] == cid]
    return hits


def _delivery_intent(canon: str, transcript: str, lang: str,
                     db) -> dict | None:
    if any(h in canon for h in _SKIP_HINTS):
        subs = _resolve_delivery_subs(db, canon)
        if not subs:
            return None
        if len(subs) > 1:
            names = " ya ".join(sorted({s["customer_name"]
                                        for s in subs}))
            desc = (f"{subs[0]['product']} kis ka — {names}? "
                    "Naam bata ke dobara bolo")
            return {"proposal_id": "", "kind": "action",
                    "intent": "delivery_skip_clarify",
                    "description": desc, "spoken": desc,
                    "confidence": 0.7, "needs_confirm": False,
                    "unresolved": [], "lang": lang}
        sub = subs[0]
        m = _re.search(r"(\d+)\s*(?:din|दिन|రోజు|రోజుల)", canon)
        count = int(m.group(1)) if m else 1
        from datetime import date, timedelta
        start_off = 0 if "aaj" in canon else \
            2 if "parso" in canon else 1
        start = date.today() + timedelta(days=start_off)
        days = [(start + timedelta(days=i)).isoformat()
                for i in range(count)]
        desc = (f"{sub['customer_name']} ka {sub['product']} — "
                f"{days[0]} se {count} din skip")
        if lang == "te":
            spoken = (f"{sub['customer_name']} {sub['product']} — "
                      f"{days[0]} నుండి {count} రోజులు స్కిప్. సరియేనా?")
        else:
            spoken = f"{desc}. Sahi hai?"
        pid = _stash("delivery_skip",
                     {"sub_id": sub["id"], "days": days}, transcript, lang)
        return {"proposal_id": pid, "kind": "action",
                "intent": "delivery_skip", "description": desc,
                "spoken": spoken, "confidence": 0.9,
                "needs_confirm": True, "unresolved": [], "lang": lang,
                "noise_hint": False}

    month_hint = any(h in canon for h in _MONTH_BILL_HINTS) or (
        "bill" in canon.split()
        and not _re.search(r"\d", canon))
    if month_hint:
        subs = _resolve_delivery_subs(db, canon)
        if not subs:
            return None
        parts = []
        spoken_parts = []
        for sub in subs:
            b = db.month_bill(sub["id"])
            parts.append(
                f"{sub['customer_name']} ka {sub['product']} — "
                f"{b['month']}: {b['days_billed']} din delivery, "
                f"{b['days_skipped']} skip, "
                f"{inr_words(b['total_paise'])}")
            if lang == "te":
                spoken_parts.append(
                    f"{sub['customer_name']} {sub['product']} — "
                    f"{b['days_billed']} రోజులు డెలివరీ, "
                    f"{b['days_skipped']} స్కిప్, "
                    f"{b['total_paise'] // 100} రూపాయలు")
        desc = ". ".join(parts)
        spoken = (". ".join(spoken_parts) if lang == "te"
                  else desc) + "."
        return {"proposal_id": "", "kind": "action",
                "intent": "delivery_month_bill", "description": desc,
                "spoken": spoken, "confidence": 1.0,
                "needs_confirm": False, "unresolved": [], "lang": lang,
                "noise_hint": False}
    return None


_LEAVE_HINTS = ("chutti", "chhutti", "nahi aaya", "nahi aayi",
                "absent", "leave le", "leave pe", "అవకాశం", "రాలేదు")


def _leave_intent(canon: str, transcript: str, lang: str,
                  db) -> dict | None:
    """'Amit kal chutti pe' -> dual-approval leave proposal."""
    if not any(h in canon for h in _LEAVE_HINTS):
        return None
    hits = [s for s in db.staff() if s["name"].lower() in canon]
    if len(hits) != 1:
        row, *_ = _match(canon.split()[0], db.staff()) \
            if canon.split() else (None, 0.0, [])
        if row is None:
            return None
        hits = [row]
    staff = hits[0]
    from datetime import date, timedelta
    off = 0 if "aaj" in canon else 2 if "parso" in canon else 1
    day = (date.today() + timedelta(days=off)).isoformat()
    desc = (f"{staff['name']} {day} ko absent mark karein? "
            "Staff ko approve/dispute karna hoga.")
    pid = _stash("leave_mark",
                 {"staff_id": staff["id"], "staff_name": staff["name"],
                  "day": day}, transcript, lang)
    return {"proposal_id": pid, "kind": "action",
            "intent": "leave_mark", "description": desc,
            "spoken": desc + " Sahi hai?", "confidence": 0.9,
            "needs_confirm": True, "unresolved": [], "lang": lang,
            "noise_hint": False}


def _reminder_or_stockout(transcript: str, lang: str,
                          db) -> dict | None:
    """Voice reminders + stock adjust — checked before bill/vendored parse."""
    canon = canonical(transcript)
    toks = set(canon.split())

    lv = _leave_intent(canon, transcript, lang, db)
    if lv is not None:
        return lv

    dv = _delivery_intent(canon, transcript, lang, db)
    if dv is not None:
        return dv

    if any(h in canon for h in _WEEKLY_HINTS):
        w = db.weekly_insights()
        sellers = ", ".join(t["name"] for t in w["top_sellers"]) \
            or "kuch nahi"
        stock_note = ("; ".join(f"{r['name']} bas {r['days_left']:g} "
                                f"din" for r in w["running_out"]) or
                      "stock theek hai")
        debt = w["top_debtors"]
        debt_note = (f"Sabse zyada udhaar {debt[0]['name']} ka "
                     f"{inr_words(debt[0]['balance_paise'])}"
                     if debt else "koi udhaar nahi")
        if lang == "te":
            s_te = ", ".join(t["name"] for t in w["top_sellers"]) \
                or "ఏమీ లేదు"
            d_te = (f"బాకీ ఎక్కువ {debt[0]['name']} — "
                    f"{debt[0]['balance_paise'] // 100} రూపాయలు"
                    if debt else "బాకీ లేదు")
            r_te = ("; ".join(f"{r['name']} {r['days_left']:g} రోజుల్లో "
                              "అయిపోతుంది" for r in w["running_out"])
                    or "స్టాక్ బాగుంది")
            desc = (f"Is hafte: top {sellers} · {stock_note} · "
                    f"{debt_note}")
            spoken = (f"ఈ వారం ఎక్కువగా {s_te} అమ్మకం. "
                      f"{r_te}. {d_te}.")
        elif lang == "en":
            desc = (f"This week: top {sellers} · {stock_note} · "
                    f"{debt_note}")
            r_en = ("; ".join(f"{r['name']} runs out in "
                              f"{r['days_left']:g} days"
                              for r in w["running_out"]) or
                    "stock looks fine")
            d_en = (f"Highest balance: {debt[0]['name']} — "
                    f"{debt[0]['balance_paise'] // 100} rupees"
                    if debt else "no balances pending")
            spoken = (f"This week, {sellers} sold the most. "
                      f"{r_en}. {d_en}.")
        else:
            desc = (f"Is hafte: top {sellers} · {stock_note} · "
                    f"{debt_note}")
            spoken = (f"Is hafte sabse zyada {sellers} bika. "
                      f"{stock_note}. {debt_note}.")
        return {"proposal_id": "", "kind": "action",
                "intent": "weekly_insights", "description": desc,
                "spoken": spoken, "confidence": 1.0,
                "needs_confirm": False, "unresolved": [],
                "lang": lang, "noise_hint": False,
                "insights": w}

    if any(h in canon for h in _SUMMARY_HINTS):
        s = db.daily_summary()
        sales = sum(v["amount_paise"] for k, v in s.items()
                    if k in ("sale", "credit_sale"))
        n = sum(v["count"] for k, v in s.items()
                if k in ("sale", "credit_sale"))
        credit = s.get("credit_sale", {}).get("amount_paise", 0)
        desc = (f"Aaj {n} bills — {inr_words(sales)} "
                f"(udhaar {inr_words(credit)})")
        spoken = (f"ఈరోజు {n} బిల్లు — {sales // 100} రూపాయలు "
                  f"(ఉధార్ {credit // 100})" if lang == "te"
                  else desc)
        return {"proposal_id": "", "kind": "action",
                "intent": "daily_summary", "description": desc,
                "spoken": spoken + ".", "confidence": 1.0,
                "needs_confirm": False, "unresolved": [],
                "lang": lang, "noise_hint": False}

    if any(h in canon for h in _VOICE_NOTE_HINTS):
        toks_l = canon.split()
        cust, used = _find_customer(toks_l)
        if not cust:
            for i, t in enumerate(toks_l):
                if t in ("ko", "को", "కు", "కి", "ke", "के") :
                    cust = _cust_before(toks_l, i) or cust
        row, score, ties = (None, 0.0, []) if not cust else \
            _match(cust, db.customers())
        desc = (f"{row['name']} ko yaad dilana hai"
                if row else f"'{cust or 'customer'}' ko yaad dilana hai")
        payload = {"kind": "voice_note", "customer_id":
                   row["id"] if row else None,
                   "customer_name": row["name"] if row else cust,
                   "text": transcript}
        pid = _stash("reminder", payload, transcript, lang)
        return {"proposal_id": pid, "kind": "action",
                "intent": "send_voice_reminder", "description": desc,
                "spoken": f"{desc}. Sahi hai?", "confidence":
                0.9 if row else 0.4,
                "needs_confirm": True, "unresolved":
                [] if row else [f"customer:{cust or '?'}'"],
                "lang": lang}

    if any(h in canon for h in _STOCK_OUT_HINTS):
        items = _non_hint_items(canon)
        items = _non_hint_items(canon)
        for it in items:
            row, score, ties = _match(it.name, db.products())
            if row is not None:
                it.product_id, it.product_name, it.score = \
                    row["id"], row["name_en"], score
        good = [i for i in items if i.product_id]
        if good:
            i0 = good[0]
            desc = (f"{i0.qty:g} {i0.unit or 'unit'} {i0.product_name} "
                    "stock se ghata do")
            payload = {"product_id": i0.product_id, "qty": -abs(i0.qty),
                       "unit": i0.unit or "piece",
                       "product_name": i0.product_name}
            pid = _stash("stock_out", payload, transcript, lang)
            return {"proposal_id": pid, "kind": "action",
                    "intent": "stock_out", "description": desc,
                    "spoken": f"{desc}. Sahi hai?", "confidence": i0.score,
                    "needs_confirm": True, "unresolved":
                    [i.name for i in items if not i.product_id],
                    "lang": lang}

    if any(h in canon for h in _RESTOCK_HINTS):
        items = _non_hint_items(canon)
        for it in items:
            row, score, ties = _match(it.name, db.products())
            if row is not None:
                it.product_id, it.product_name, it.score = \
                    row["id"], row["name_en"], score
        if items:
            lines = [f"{i.qty:g} {i.unit or ''} {i.product_name or i.name}"
                     for i in items]
            desc = "Restock list: " + "; ".join(lines)
            payload = {"kind": "restock", "text": transcript,
                       "items": [{"name": i.product_name or i.name,
                                  "product_id": i.product_id,
                                  "qty": i.qty, "unit": i.unit}
                                 for i in items]}
            pid = _stash("reminder", payload, transcript, lang)
            return {"proposal_id": pid, "kind": "action",
                    "intent": "add_to_shopping_list", "description": desc,
                    "spoken": "Restock list mein daal diya. Sahi hai?",
                    "confidence": min((i.score for i in items),
                                      default=0.0),
                    "needs_confirm": True,
                    "unresolved": [i.name for i in items
                                   if not i.product_id],
                    "lang": lang}
    return None


def command_to_proposal(transcript: str, lang: str, db) -> dict:
    """Returns a JSON-safe proposal dict (with proposal_id)."""
    extra = _reminder_or_stockout(transcript, lang, db)
    if extra is not None:
        return extra

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
            "noise_hint": bill.confidence < 0.75 or bool(bill.unresolved),
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
        "noise_hint": (prop.confidence or 1.0) < 0.75 or bool(prop.error),
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

    if entry["kind"] == "reminder":
        p = entry["obj"]
        rid = db.add_reminder(p["kind"], p, customer_id=p.get("customer_id"))
        out = {"ok": True, "written": True, "reminder_id": rid,
               "spoken": speak_text.done(lang)}
        if p["kind"] == "voice_note":
            row = db.conn.execute(
                "SELECT token FROM reminders WHERE id=?", (rid,)).fetchone()
            token = row["token"] if row else ""
            note = _voice_note_text(p, lang, db)
            audio_err = ""
            try:
                from app.tts import synth_wav
                audio, _ms = synth_wav(note, lang)
                import pathlib
                vdir = pathlib.Path(
                    config.DB_PATH).parent / "voice_notes"
                vdir.mkdir(parents=True, exist_ok=True)
                f = vdir / f"{token}.wav"
                f.write_bytes(audio)
                db.set_reminder_audio(rid, f"/api/voice/{token}.wav")
            except Exception as e:  # noqa: BLE001
                audio_err = str(e)[:120]
            db.conn.execute(
                "UPDATE reminders SET payload=? WHERE id=?",
                (json.dumps({**p, "note_text": note},
                            ensure_ascii=False), rid))
            db.conn.commit()
            out["confirm_path"] = f"/r/{token}"
            out["audio_error"] = audio_err
            out["note_text"] = note
        return out

    if entry["kind"] == "leave_mark":
        p = entry["obj"]
        lid = db.leave_mark(p["staff_id"], p["day"], marked_by="owner")
        return {"ok": True, "written": True, "leave_id": lid,
                "spoken": speak_text.done(lang)}

    if entry["kind"] == "delivery_skip":
        p = entry["obj"]
        n = db.add_skips(p["sub_id"], p["days"])
        return {"ok": True, "written": True, "skipped": n,
                "spoken": speak_text.done(lang)}

    if entry["kind"] == "stock_out":
        p = entry["obj"]
        tid = db.adjust_stock(
            p["product_id"], p["qty"], unit=p["unit"],
            note=entry["transcript"], transcript=entry["transcript"],
            idempotency_key=f"adj:{proposal_id}")
        return {"ok": True, "written": True, "txn_id": tid,
                "spoken": speak_text.done(lang)}

    prop = entry["obj"]
    aid = db.propose({"transcript": entry["transcript"],
                      "intent": prop.intent})
    tid = apply_action(prop, db, transcript=entry["transcript"],
                       audit_id=aid)
    return {"ok": True, "written": True, "txn_id": tid,
            "spoken": speak_text.done(lang)}
