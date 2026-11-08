"""Timbre TTS proxy — REST buffered path + SSE streaming path.

/api/tts returns audio/wav bytes (REST /api/v1/tts/inference, proven).
/api/tts/stream forwards SSE events to the client for earlier playback.
Mock mode returns a short generated tone so the UI path is testable.
"""

from __future__ import annotations

import base64
import io
import json
import math
import struct
import time
import wave

import requests
from fastapi import APIRouter
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from app import config

router = APIRouter()


class SpeakReq(BaseModel):
    text: str
    lang: str = "hinglish"


def _voice(lang_key: str) -> tuple[str, str]:
    lang = config.LANGS.get(lang_key, config.LANGS["hinglish"])
    return lang["tts_voice"], lang["tts_lang"]


def _mock_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        frames = b"".join(
            struct.pack("<h", int(12000 * math.sin(2 * math.pi * 440 * t / 16000)))
            for t in range(16000 // 2))
        w.writeframes(frames)
    return buf.getvalue()


def synth_wav(text: str, lang_key: str) -> tuple[bytes, int]:
    """Returns (wav bytes, latency_ms)."""
    if config.USE_MOCK_GNANI:
        return _mock_wav(), 0
    voice, tts_lang = _voice(lang_key)
    t0 = time.time()
    last_exc: Exception | None = None
    for attempt in range(3):
        try:
            resp = requests.post(
                config.TTS_REST_URL,
                headers={"Content-Type": "application/json",
                         "X-API-Key-ID": config.GNANI_API_KEY},
                json={"text": text, "voice": voice,
                      "model": config.TTS_MODEL,
                      "language": tts_lang, "speed": 1.0,
                      "audio_config": {"sample_rate": 16000,
                                       "encoding": "linear_pcm",
                                       "container": "wav"}},
                timeout=30)
            if resp.status_code < 400:
                ms = int((time.time() - t0) * 1000)
                return resp.content, ms
            last_exc = requests.HTTPError(
                f"{resp.status_code}: {resp.text[:200]}")
        except requests.RequestException as e:
            last_exc = e
        time.sleep(0.4 * (attempt + 1))
    raise last_exc or RuntimeError("tts failed")


@router.post("/api/tts")
def speak(req: SpeakReq) -> Response:
    audio, _ = synth_wav(req.text, req.lang)
    return Response(content=audio, media_type="audio/wav")


@router.post("/api/tts/stream")
def speak_stream(req: SpeakReq) -> StreamingResponse:
    if config.USE_MOCK_GNANI:
        def gen_mock():
            yield f"event: chunk\ndata: {json.dumps({'audio': base64.b64encode(_mock_wav()).decode(), 'is_final': True})}\n\n"
        return StreamingResponse(gen_mock(), media_type="text/event-stream")

    voice, tts_lang = _voice(req.lang)

    def gen():
        with requests.post(
                config.TTS_SSE_URL, stream=True,
                headers={"Content-Type": "application/json",
                         "X-API-Key-ID": config.GNANI_API_KEY},
                json={"text": req.text, "voice": voice,
                      "model": config.TTS_MODEL, "language": tts_lang,
                      "speed": 1.0,
                      "audio_config": {"sample_rate": 16000,
                                       "encoding": "linear_pcm",
                                       "container": "wav"}},
                timeout=30) as r:
            r.raise_for_status()
            for line in r.iter_lines(decode_unicode=True):
                if line:
                    yield line + "\n"
                else:
                    yield "\n"

    return StreamingResponse(gen(), media_type="text/event-stream")
