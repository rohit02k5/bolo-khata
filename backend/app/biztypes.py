"""Business-type configs — a fixed module list toggled per type.

'Other' lets the owner pick from this FIXED list only (schema-validated)
— no arbitrary schema edits. Delivery billing covers milk/newspaper
(delivered-days minus skips); gyms/subscription businesses deliberately
stay off that model — see /about for the contrast.
"""

from __future__ import annotations

MODULES = ("ledger", "stock", "billing", "delivery", "staff",
           "reminders", "upi")

_ON = {m: True for m in MODULES}
OFF = {m: False for m in MODULES}


def _preset(**over):
    return {**OFF, **over}


BUSINESS_TYPES: dict[str, dict] = {
    "kirana": dict(_ON),
    "milk": _preset(ledger=True, billing=True, delivery=True,
                   reminders=True, upi=True),
    "newspaper": _preset(ledger=True, billing=True, delivery=True,
                         reminders=True, upi=True),
    "fruit_veg": _preset(ledger=True, stock=True, billing=True,
                        reminders=True, upi=True),
    "other": dict(_ON),
}

_TYPE_ALIASES = {
    "kirana": ("kirana", "किराना", "general store", "kiryana",
               "గrocery"),
    "milk": ("milk", "doodh", "dairy", "दूध", "పాల"),
    "newspaper": ("newspaper", "paper", "akhbar", "अखबार", "పేపర్"),
    "fruit_veg": ("fruit", "sabzi", "vegetable", "फल", "सब्जी",
                  "పండ్ల", "కూరగాయల"),
    "other": ("other", "koi aur", "custom", "दूसरा", "ఇతర"),
}


def type_for_word(word: str) -> str | None:
    w = word.strip().lower()
    for t, aliases in _TYPE_ALIASES.items():
        if w in aliases:
            return t
    return None


def validate_config(business_type: str, modules: dict,
                    labels: dict) -> tuple[bool, str]:
    """Only keys from the FIXED module list; values strictly bool.
    Labels are short strings, plain rename only."""
    if business_type not in BUSINESS_TYPES:
        return False, f"unknown business type {business_type!r}"
    if not isinstance(modules, dict):
        return False, "modules must be an object"
    bad = set(modules) - set(MODULES)
    if bad:
        return False, f"unknown modules: {sorted(bad)}"
    if any(not isinstance(v, bool) for v in modules.values()):
        return False, "module values must be true/false"
    if not modules.get("ledger", True):
        return False, "ledger cannot be disabled — it is the product"
    if not isinstance(labels, dict):
        return False, "labels must be an object"
    for k, v in labels.items():
        if not isinstance(k, str) or not isinstance(v, str) or \
                len(k) > 40 or len(v) > 40:
            return False, "labels: keys/values must be short strings"
    return True, ""


def effective_modules(cfg: dict) -> dict:
    """Preset for the type, overlaid with stored module toggles."""
    base = dict(BUSINESS_TYPES.get(cfg["business_type"],
                                   BUSINESS_TYPES["kirana"]))
    for k, v in (cfg.get("modules") or {}).items():
        if k in MODULES and isinstance(v, bool):
            base[k] = v
    return base
