"""Spoken reply strings per UI language.

hi/hinglish use bolta.say word-forms (verified round-trip); te/en rely on
Timbre's built-in text normalization for digits (flagged for the Telugu
speaker to verify by ear — see PLAN risk #5).
"""

from __future__ import annotations

_DONE = {
    "hinglish": "Theek hai, likh diya.",
    "hi": "ठीक है, लिख दिया।",
    "te": "సరే, రాశాను.",
    "en": "Done, written.",
}
_DENY = {
    "hinglish": "Theek hai, nahi likha.",
    "hi": "ठीक है, नहीं लिखा।",
    "te": "సరే, రాయలేదు.",
    "en": "Okay, not written.",
}
_REASK = {
    "hinglish": "Samajh nahi aaya, dobara bolo.",
    "hi": "समझ नहीं आया, दोबारा बोलो।",
    "te": "అర్థం కాలేదు, మళ్లీ చెప్పండి.",
    "en": "Didn't catch that, say it again.",
}


def done(lang: str) -> str:
    return _DONE.get(lang, _DONE["hinglish"])


def deny(lang: str) -> str:
    return _DENY.get(lang, _DENY["hinglish"])


def reask(lang: str) -> str:
    return _REASK.get(lang, _REASK["hinglish"])


def for_action(prop, lang: str) -> str:
    """Spoken text for a vendored ActionProposal in any UI lang."""
    if lang in ("hi", "hinglish"):
        return prop.speak(lang)
    # te/en: strip the trailing "Sahi hai?" pattern and reuse hi text shape
    # only if no better template exists — description is always safe.
    if prop.error:
        return reask(lang)
    return prop.description if lang == "en" else prop.description
