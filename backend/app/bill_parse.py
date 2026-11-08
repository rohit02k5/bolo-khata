"""Multi-item bill extraction — extends the vendored rules parser.

Voice: "2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam"
After canonical(): "2 kilo cheeni 1 maggi 500 gram dal ramesh ke naam"

Split into item triplets (qty [unit] product-words), pull a customer
mention off the tail, fuzzy-resolve each product, price from the catalog,
total in paise. Never guesses silently: per-item unresolved/ambiguity
surfaces to the confirm card.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from bolta.parse import UNITS, STOPWORDS, CASE_MARKERS
from bolta.resolve import _match
from noiselab.normalize import canonical

_NUM = re.compile(r"^\d+(?:\.\d+)?$")

# Customer markers: "<name> ke naam", "<name> ke khate me", "<name> ko"
_NAME_TAIL = {"naam", "khata", "khate", "khaata", "pe", "peru", "naamam",
              "नाम", "खाता", "खाते", "पे", "पर",
              "నామం", "పేరు", "ఖాతా", "ఖాతాలో", "లో"}

# Telugu/Hindi unit spellings missing from the vendored UNITS map
_EXTRA_UNITS = {"గ్రాము": "g", "గ్రాముల": "g", "గ్రా": "g",
                "గ్రాములు": "g", "లీటరు": "l", "లీటర్లు": "l",
                "ముట్ట": "packet", "ప్యాకెట్": "packet", "पैकेट": "packet"}


def _unit_of(tok: str) -> str:
    return UNITS.get(tok) or _EXTRA_UNITS.get(tok) or ""
_SEPARATORS = {"aur", "and", "or", "plus", "phir", "bhi", "और", "మరియు",
               "inka", "also"}
_CHECKOUT_WORDS = {"khata", "khate", "udhaar", "udhar", "cash", "nagad",
                   "upi", "bill", "banao", "likho", "likh", "do", "de",
                   "जमा", "उधार", "नकद", "बिल"}

# unit conversions into the product's own unit (price is per product unit)
_TO_BASE = {("g", "kg"): 0.001, ("kg", "g"): 1000.0,
            ("ml", "liter"): 0.001, ("liter", "ml"): 1000.0}


@dataclass
class BillItem:
    name: str = ""
    product_id: int | None = None
    product_name: str = ""
    qty: float = 1.0
    unit: str = ""
    unit_price_paise: int = 0
    line_total_paise: int = 0
    score: float = 0.0
    options: list[str] = field(default_factory=list)


@dataclass
class Bill:
    intent: str = "add_bill"
    items: list[BillItem] = field(default_factory=list)
    customer: str = ""
    customer_id: int | None = None
    customer_name: str = ""
    customer_options: list[str] = field(default_factory=list)
    total_paise: int = 0
    confidence: float = 1.0
    unresolved: list[str] = field(default_factory=list)
    raw: str = ""


def _looks_like_bill(tokens: list[str]) -> bool:
    """≥2 number tokens, or qty+unit plus a customer tail, or khata words."""
    nums = sum(1 for t in tokens if _NUM.match(t))
    if nums >= 2:
        return True
    toks = set(tokens)
    if nums >= 1 and toks & (_NAME_TAIL | _CHECKOUT_WORDS):
        return True
    return False


def _find_customer(tokens: list[str]) -> tuple[str, set[int]]:
    """Patterns: NAME (ke|ka|ko) (naam|khata|khate) | trailing NAME ko."""
    for i, t in enumerate(tokens[:-1]):
        if t in CASE_MARKERS and tokens[i + 1] in _NAME_TAIL:
            if i >= 1 and not _NUM.match(tokens[i - 1]) \
                    and tokens[i - 1] not in STOPWORDS:
                return tokens[i - 1], {i - 1, i, i + 1}
    # "ramesh ko" at the end
    if len(tokens) >= 2 and tokens[-1] in CASE_MARKERS \
            and not _NUM.match(tokens[-2]) \
            and tokens[-2] not in STOPWORDS:
        return tokens[-2], {len(tokens) - 2, len(tokens) - 1}
    # bare "name + tail": "రమేష్ పేరు", "ramesh naam"
    for i, t in enumerate(tokens[:-1]):
        if tokens[i + 1] in _NAME_TAIL and not _NUM.match(t) \
                and t not in STOPWORDS and t not in CASE_MARKERS \
                and t not in _NAME_TAIL and t not in _CHECKOUT_WORDS:
            return t, {i, i + 1}
    return "", set()


def _segments(tokens: list[str]) -> list[list[str]]:
    """Split into item-ish chunks at numbers and separators.

    Each chunk starts with a number (qty). Words after a leading number
    that is followed by a unit word are still in the same chunk.
    """
    chunks: list[list[str]] = []
    cur: list[str] = []
    for i, t in enumerate(tokens):
        nxt = tokens[i + 1] if i + 1 < len(tokens) else ""
        if _NUM.match(t) and cur and any(not _NUM.match(c) for c in cur):
            chunks.append(cur)
            cur = [t]
        elif t in _SEPARATORS:
            if cur:
                chunks.append(cur)
                cur = []
        else:
            cur.append(t)
    if cur:
        chunks.append(cur)
    return chunks


def _parse_item(chunk: list[str]) -> BillItem | None:
    qty = 1.0
    unit = ""
    words: list[str] = []
    i = 0
    if chunk and _NUM.match(chunk[0]):
        qty = float(chunk[0])
        i = 1
        if i < len(chunk) and _unit_of(chunk[i]):
            unit = _unit_of(chunk[i])
            i += 1
    words = [t for t in chunk[i:]
             if t not in STOPWORDS and t not in UNITS and t not in _SEPARATORS
             and t not in _CHECKOUT_WORDS and not _NUM.match(t)]
    if not words:
        return None
    return BillItem(name=" ".join(words), qty=qty, unit=unit)


def _convert(qty: float, unit: str, base_unit: str) -> float:
    if not unit or unit == base_unit:
        return qty
    factor = _TO_BASE.get((unit, base_unit))
    return qty * factor if factor else qty


def parse_bill(text: str, db) -> Bill:
    canon = canonical(text)
    tokens = canon.split()
    bill = Bill(raw=canon)
    if not tokens or not _looks_like_bill(tokens):
        bill.confidence = 0.0
        bill.unresolved = ["items"]
        return bill

    cust, consumed = _find_customer(tokens)
    bill.customer = cust
    remaining = [t for i, t in enumerate(tokens) if i not in consumed]

    for chunk in _segments(remaining):
        item = _parse_item(chunk)
        if item is None:
            continue
        row, score, ties = _match(item.name, db.products())
        item.score = score
        if row is not None:
            item.product_id = row["id"]
            item.product_name = row["name_en"]
            base_unit = row["unit"]
            qty_base = _convert(item.qty, item.unit or base_unit, base_unit)
            price = db.price_paise(row["id"])
            item.unit = item.unit or base_unit
            item.unit_price_paise = (
                int(round(price * _TO_BASE[(item.unit, base_unit)]))
                if (item.unit, base_unit) in _TO_BASE else price)
            item.line_total_paise = int(round(qty_base * price))
            if ties:
                item.options = [t["name_en"] for t in [row] + ties]
        else:
            item.options = [r["name_en"] for r in ties]
            bill.unresolved.append(item.name)
        bill.items.append(item)

    if cust:
        row, score, ties = _match(cust, db.customers())
        if row is not None:
            bill.customer_id = row["id"]
            bill.customer_name = row["name"]
            if ties:
                bill.customer_options = [t["name"] for t in [row] + ties]
        else:
            bill.customer_options = [r["name"] for r in ties]
            bill.unresolved.append(f"customer:{cust}")

    bill.total_paise = sum(i.line_total_paise for i in bill.items)
    scores = [i.score for i in bill.items]
    base_conf = min(scores) if scores else 0.0
    if bill.unresolved:
        base_conf = min(base_conf, 0.4)
    if any(i.options for i in bill.items) or bill.customer_options:
        base_conf = min(base_conf, 0.55)
    bill.confidence = max(0.0, base_conf)
    if not bill.items:
        bill.intent = "unknown"
        bill.confidence = 0.0
        bill.unresolved = bill.unresolved or ["items"]
    return bill
