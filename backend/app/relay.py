"""WebSocket relay: browser mic -> Prisma streaming STT.

Verified against the live API (2026-11-08):
- wss://api.vachana.ai/stt/v3/stream
- headers: x-api-key-id, model, language_code, x-sample-rate, format
- streaming accepts ONE locale in language_code OR 'indic-auto';
  comma-separated codes are rejected (use indic-auto for auto-detect
  with mid-stream language switching).
- 'keyterms' header biases vocabulary (catalog + customer names).
- server emits connected/speech_start/transcript(final)/error/session_end;
  final transcripts arrive ~100 ms after utterance end. 60 s idle timeout.
- 'partials' header is ignored -> only final transcripts are available;
  the UI shows 'listening...' between speech_start and transcript.
"""

from __future__ import annotations

import asyncio
import json
import logging

import websockets
from fastapi import WebSocket, WebSocketDisconnect

from app import config

log = logging.getLogger("relay")


async def stt_relay(websocket: WebSocket, keyterms: list[str]) -> None:
    await websocket.accept()

    headers = {
        "x-api-key-id": config.KEY,
        "model": config.STT_MODEL,
        "language_code": "indic-auto",
        "x-sample-rate": "16000",
        "format": config.STT_FORMAT,
    }
    if keyterms:
        headers["keyterms"] = ",".join(keyterms[:80])

    try:
        up = await websockets.connect(
            config.STT_STREAM_URL, additional_headers=headers,
            ping_interval=20, ping_timeout=20, open_timeout=10)
    except Exception as e:  # noqa: BLE001 - surface to client
        log.warning("upstream connect failed: %s", e)
        await websocket.send_text(json.dumps(
            {"type": "error", "message": f"STT connect failed: {e}"}))
        await websocket.close()
        return

    async def browser_to_prisma():
        try:
            while True:
                msg = await websocket.receive()
                if msg.get("type") == "websocket.disconnect":
                    break
                if msg.get("bytes") is not None:
                    await up.send(msg["bytes"])
                elif msg.get("text") is not None:
                    # pass client control messages (e.g. {"type":"commit"})
                    await up.send(msg["text"])
        except (WebSocketDisconnect, websockets.ConnectionClosed):
            pass
        try:
            await up.send(json.dumps({"type": "commit"}))
        except Exception:  # noqa: BLE001
            pass

    async def prisma_to_browser():
        try:
            async for msg in up:
                await websocket.send_text(msg)
        except (websockets.ConnectionClosed, WebSocketDisconnect):
            pass

    tasks = [asyncio.ensure_future(browser_to_prisma()),
             asyncio.ensure_future(prisma_to_browser())]
    done, pending = await asyncio.wait(
        tasks, return_when=asyncio.FIRST_COMPLETED)
    for t in pending:
        t.cancel()
    try:
        await up.close()
    except Exception:  # noqa: BLE001
        pass
