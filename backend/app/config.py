"""Runtime configuration — everything from env, nothing hard-coded."""

import os
from pathlib import Path

GNANI_API_KEY = os.environ.get("GNANI_API_KEY", "")
KEY = GNANI_API_KEY  # short alias used by relay/tts
USE_MOCK_GNANI = not GNANI_API_KEY or os.environ.get("MOCK_GNANI") == "1"

STT_STREAM_URL = "wss://api.vachana.ai/stt/v3/stream"
STT_REST_URL = "https://api.vachana.ai/stt/v3"
TTS_REST_URL = "https://api.vachana.ai/api/v1/tts/inference"
TTS_SSE_URL = "https://api.vachana.ai/api/v1/tts/sse"

# STT model selection. v3.0 gives auto language detect + code-mix styles;
# v2.5 is the proven fallback (measured in NoiseLab).
STT_MODEL = os.environ.get("STT_MODEL", "prisma-v3.0")
STT_FORMAT = os.environ.get("STT_FORMAT", "transcribe")

# UI lang key -> (Prisma language_code, TTS voice, TTS language)
LANGS = {
    "hinglish": {
        "stt_v3": "hi-IN,en-IN",
        "stt_v25": "en-IN",
        "tts_voice": "Poorvi",
        "tts_lang": "hi-en",
        "parse_lang": "hinglish",
    },
    "hi": {
        "stt_v3": "hi-IN",
        "stt_v25": "hi-IN",
        "tts_voice": "Nalini",
        "tts_lang": "hi-IN",
        "parse_lang": "hi",
    },
    "te": {
        "stt_v3": "te-IN",
        "stt_v25": "te-IN",
        "tts_voice": "Suhana",
        "tts_lang": "te-IN",
        "parse_lang": "te",
    },
    "en": {
        "stt_v3": "en-IN",
        "stt_v25": "en-IN",
        "tts_voice": "Kaveri",
        "tts_lang": "en-IN",
        "parse_lang": "hinglish",
    },
}

# VAD tuning for a noisy shop counter (see docs.gnani.ai STT realtime).
VAD_HEADERS = {
    "x-sample-rate": "16000",
    "x-min-silence-ms": "450",
    "x-vad-threshold": "0.65",
    "x-min-segment-ms": "200",
    "x-idle-timeout-sec": "120",
}

TTS_MODEL = os.environ.get("TTS_MODEL", "timbre-v2.5")

DB_PATH = os.environ.get(
    "DB_PATH", str(Path(__file__).resolve().parent.parent / "data" / "bolo.db"))

# Seeded demo owner (auth option per approved plan — no magic links)
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "owner@bolokhata.demo")
OWNER_PASSWORD = os.environ.get("OWNER_PASSWORD", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-only-change-me")

# UPI VPA shown on Pay Now QR (demo/synthetic)
SHOP_VPA = os.environ.get("SHOP_VPA", "bolokhata-demo@upi")
SHOP_NAME = os.environ.get("SHOP_NAME", "Sharma Kirana Store")

# Read-back confirmation threshold (paise) — above this we always re-ask
CONFIRM_AMOUNT_PAISE = int(os.environ.get("CONFIRM_AMOUNT_PAISE", "50000"))

# OAuth (Google / Discord) — owner sign-in. Leave blank to disable;
# the UI hides providers that are not configured.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
# override redirect base if the API sits behind a different public host
# than the incoming request (default: derived per-request)
OAUTH_REDIRECT_BASE = os.environ.get("OAUTH_REDIRECT_BASE", "")
