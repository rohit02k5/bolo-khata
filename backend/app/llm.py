"""Optional LLM assist (Groq/OpenAI-compatible) — NOT the primary path.

Per the approved plan, extraction is deterministic rules-first (the
vendored `bolta` parser). This module is a *rescue/phrasing* layer used
only when `LLM_ASSIST=1`:

1. `rescue_parse()` — when the rules parser leaves slots unresolved, the
   transcript is sent to the LLM to map onto our FIXED intent schema.
   Output is validated by the same parser contract before it can even
   reach a proposal; the confirm card still gates every write. Numbers
   it returns are treated as slots, never computed by the LLM.
2. `phrase()` — Phase 1.5 reminder/insight phrasing where all figures
   are computed in code and the LLM only chooses words.

Everything is schema-validated; prompt-injection safety: the transcript
is data (inside a delimited block) and the model must return JSON only.
"""

from __future__ import annotations

import json
import os
import urllib.request

PROVIDERS = {
    "groq": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "model": "llama-3.3-70b-versatile",
        "key": os.environ.get("GROQ_API_KEY", ""),
    },
    "nvidia": {
        "url": "https://integrate.api.nvidia.com/v1/chat/completions",
        "model": "meta/llama-3.3-70b-instruct",
        "key": os.environ.get("NVIDIA_API_KEY", ""),
    },
}

ENABLED = os.environ.get("LLM_ASSIST") == "1"
PROVIDER = os.environ.get("LLM_PROVIDER", "groq")
TIMEOUT_S = 3.0


def _chat(system: str, user: str, max_tokens: int = 400) -> str | None:
    if not ENABLED:
        return None
    p = PROVIDERS.get(PROVIDER, PROVIDERS["groq"])
    if not p["key"]:
        return None
    req = urllib.request.Request(
        p["url"],
        data=json.dumps({
            "model": p["model"],
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"},
        }).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {p['key']}"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as r:
            body = json.loads(r.read().decode("utf-8"))
        return body["choices"][0]["message"]["content"]
    except Exception:  # noqa: BLE001 - assist must never break the flow
        return None


INTENTS = ("add_bill", "add_payment", "stock_in", "stock_out",
           "query_balance", "daily_summary", "set_reminder",
           "add_to_shopping_list", "send_voice_reminder",
           "weekly_insights", "undo_last", "clarify", "unknown")


def rescue_parse(transcript: str, product_names: list[str],
                 customer_names: list[str]) -> dict | None:
    """Map a transcript the rules parser couldn't resolve onto the fixed
    intent schema. Returns None on any problem — caller falls back to the
    rules 'clarify' path."""
    system = (
        "You convert a kirana-shop voice command into strict JSON. "
        "The transcript may be Hindi (Devanagari), Telugu, Hinglish or "
        "English. Output ONLY JSON: "
        '{"intent": <one of ' + ",".join(INTENTS) + '>, '
        '"items": [{"name": <string>, "qty": <number>, "unit": <string>}], '
        '"customer": <string or null>, "amount_paise": <int or null>, '
        '"confidence": <0-1>}. '
        "Match item/customer names to the CATALOG and CUSTOMERS lists "
        "when possible; use the list spelling. If nothing fits, return "
        'intent "clarify" with confidence 0.')
    user = (
        "CATALOG: " + ", ".join(product_names[:80]) + "\n"
        "CUSTOMERS: " + ", ".join(customer_names[:40]) + "\n"
        "TRANSCRIPT <<<" + transcript + ">>>")
    raw = _chat(system, user)
    if not raw:
        return None
    try:
        out = json.loads(raw)
    except ValueError:
        return None
    if out.get("intent") not in INTENTS:
        return None
    try:
        out["confidence"] = float(out.get("confidence") or 0)
    except (TypeError, ValueError):
        out["confidence"] = 0.0
    out.setdefault("items", [])
    out.setdefault("customer", None)
    out.setdefault("amount_paise", None)
    return out


def phrase(template_vars: dict, style: str) -> str | None:
    """Natural-language phrasing; numbers come from template_vars only."""
    system = (
        "Rewrite the DATA as a short polite Hinglish sentence for a "
        "kirana customer/owner. Use ONLY the numbers given; never invent "
        "figures. Output JSON {\"text\": \"...\"}.")
    user = f"STYLE: {style}\nDATA: {json.dumps(template_vars, ensure_ascii=False)}"
    raw = _chat(system, user, max_tokens=120)
    if not raw:
        return None
    try:
        text = json.loads(raw).get("text")
        return str(text) if text else None
    except ValueError:
        return None
