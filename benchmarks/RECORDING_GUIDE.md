# Recording guide — 20 phrases × 4 conditions × 2 languages

Goal: a small, honest, *own-voice* benchmark set that feeds `/benchmark`.

## Setup

- Phone mic, default recorder app, WAV or M4A (convert to WAV 16 kHz mono
  if you can — `ffmpeg -i in.m4a -ar 16000 -ac 1 out.wav`).
- Read each phrase **at counter volume**, once. Stumbles are fine — real
  data is the point.

## Conditions

| Dir | How to fake it honestly |
|---|---|
| `quiet` | closed room |
| `shop_noise` | fan + TV/music playing in the room |
| `traffic` | near an open window / balcony with road noise |
| `speakerphone` | play the phrase from a second phone's speaker, record on the first |

## File layout

```
benchmarks/recordings/
  hinglish/quiet/h01.wav
  hinglish/shop_noise/h01.wav
  hinglish/traffic/h01.wav
  hinglish/speakerphone/h01.wav
  te/quiet/t01.wav
  ...
```

Phrase IDs and expected results live in `phrases.csv` (15 Hinglish + 5
Telugu). Speak the Telugu rows in Telugu; Hinglish rows as written.

## Score

```bash
cd backend
.venv/Scripts/python scripts/score_recordings.py \
    --root ../benchmarks/recordings --out ../benchmarks/scores.csv
```

STT calls are cached (`transcribe_cached`) — re-runs cost nothing.
Then update `/benchmark` with the measured numbers.
