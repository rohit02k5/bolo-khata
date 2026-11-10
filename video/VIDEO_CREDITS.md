# Video credits — Bolo Khata brand film

## Music & SFX — in-house procedural (video/make_music.py)
All generated with a Python synthesizer in this repo; no external
samples, no third-party license required (original work, CC0-equivalent,
ours to use freely).

| Asset | Source |
|---|---|
| music-loop.wav — tabla-ish 120 BPM percussion bed | procedural, make_music.py |
| ting.wav — cash "ting" | procedural |
| whoosh.wav — paper-flip transition | procedural |
| pop.wav — soft mic-pop | procedural |
| thud.wav — stamp hit | procedural |

## Voice assets
| Asset | Source |
|---|---|
| Hero + other voice turns | Rohit's real WhatsApp voice memo (D:\Gnani\shot\voice\*.wav), played into the app via virtual mic; labelled on-screen |
| Narration vo01–vo12 | Gnani Timbre TTS via /api/tts (no human vo.wav existed → credited on end card) |
| reminder.wav / reminder-te.wav | real reminder audio served by the app (/api/voice/*.wav + TTS) |
| te-readback.wav | real Timbre readback for the Telugu bill |

## Footage
Every app shot: Playwright screen recordings of the live deployed app
(tunnel URL), real browser WebSocket → real Prisma STT + real Timbre TTS.
No mocked UI, no ?say= hook, no fake transcripts. The ask-back beat uses
the app's real editable-transcript feature (labelled on-screen).

## Typefaces (system/local)
Baloo 2, Noto Sans Devanagari, Hind Guntur — OFL-licensed.
