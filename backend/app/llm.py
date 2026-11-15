"""LLM fallback for voice commands — NVIDIA NIM (OpenAI-compatible API).

Only consulted when the deterministic parser can't produce a confident
proposal. The model's job is narrow: decide the *intent* and extract raw
item mentions. All catalog/customer resolution, pricing and stock math
still happen deterministically downstream — the LLM never writes data.
"""

from __future__ import annotations

import json
import logging
import re

import requests

from app import config

log = logging.getLogger("bolo.llm")

ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions"
_TIMEOUT = 60  # NIM cold-starts can take ~60s; warm calls are ~2-5s

_SYSTEM = """You parse voice commands for an Indian kirana (grocery) shop assistant.
The shopkeeper speaks Hinglish, Hindi, Telugu or English, often mixing them.
Reply with ONLY a JSON object — no prose, no markdown.

Schema:
{"intent": "add_bill|restock|voice_reminder|stock_out|stock_query|unknown",
 "customer": "<customer name or null>",
 "items": [{"name": "<item>", "qty": <number>, "unit": "<unit>"}],
 "query_item": "<product name or null>"}

Intents:
- add_bill: a customer is buying items NOW — "ke naam", "ka khata", "udhaar", a list of items.
- restock: the SHOP needs to order/buy items — "mangwana", "order karna", "next week", "2 hafte baad", "list mein daalo", "bhijwani/भिजवानी" for shop stock. Time phrases are scheduling hints, never items.
- voice_reminder: remind or message a CUSTOMER about payment/delivery — "yaad dilao", "remind", "याद कराना", "घर पर भेजना".
- stock_out: an item is damaged/finished — "khatam", "kharab", "nikal diya", "expired".
- stock_query: asking about stock or price — "kitni bachi", "daam kya", "avalaina".
- unknown: chit-chat or genuinely unclear — prefer this over guessing.

Rules:
- items.name: copy the catalog name EXACTLY when the spoken item matches one (match loosely: "cheeni"->"Chini", "chawal"->"Chawal"). If nothing matches, use the spoken name.
- qty defaults to 1; unit defaults to the catalog unit (kg/g/liter/ml/packet/piece/dozen/cup/bottle/dabba/sachet/box).
- customer: the person the command is ABOUT (buyer for bills, recipient for reminders). null if none.
- query_item only for stock_query.
- Devanagari/Telugu script is fine — understand it."""


def enabled() -> bool:
    return bool(config.NVIDIA_API_KEY)


def _ctx_lines(products, customers) -> str:
    cat = "; ".join(
        f"{p['name_en']}({p['unit']})"
        + (f" aka {p['aliases']}" if p["aliases"] else "")
        for p in (dict(r) for r in products[:80]))
    cust = ", ".join(c["name"] for c in customers[:60])
    return f"CATALOG: {cat}\nCUSTOMERS: {cust}"


def interpret(transcript: str, products, customers,
              lang: str = "hinglish") -> dict | None:
    """Ask the LLM to classify + extract. Returns a dict or None."""
    if not enabled():
        return None
    user = (f"LANG: {lang}\nTRANSCRIPT: {transcript}\n\n"
            + _ctx_lines(products, customers))
    try:
        r = requests.post(ENDPOINT, timeout=_TIMEOUT, json={
            "model": config.NVIDIA_MODEL,
            "messages": [{"role": "system", "content": _SYSTEM},
                         {"role": "user", "content": user}],
            "temperature": 0.1,
            "max_tokens": 500,
            "stream": False,
        }, headers={
            "Authorization": f"Bearer {config.NVIDIA_API_KEY}",
            "Content-Type": "application/json",
        })
        if not r.ok:
            log.warning("llm %s: %s", r.status_code, r.text[:200])
            return None
        content = r.json()["choices"][0]["message"]["content"]
    except Exception as e:  # noqa: BLE001 — fallback must never break voice
        log.warning("llm call failed: %s", e)
        return None
    return _parse_json(content)


def _parse_json(content: str) -> dict | None:
    content = (content or "").strip()
    content = re.sub(r"^```(?:json)?|```$", "", content,
                     flags=re.MULTILINE).strip()
    m = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if not m:
        return None
    try:
        data = json.loads(m.group(0))
    except ValueError:
        return None
    if not isinstance(data, dict):
        return None
    intent = data.get("intent")
    if intent not in ("add_bill", "restock", "voice_reminder",
                      "stock_out", "stock_query", "unknown"):
        return None
    items = []
    for it in (data.get("items") or [])[:20]:
        if not isinstance(it, dict):
            continue
        try:
            qty = float(it.get("qty") or 1)
        except (TypeError, ValueError):
            qty = 1.0
        name = str(it.get("name") or "").strip()[:60]
        if not name or qty <= 0:
            continue
        items.append({"name": name, "qty": qty,
                      "unit": str(it.get("unit") or "")[:20]})
    return {
        "intent": intent,
        "customer": str(data.get("customer") or "")[:60],
        "items": items,
        "query_item": str(data.get("query_item") or "")[:60],
    }
