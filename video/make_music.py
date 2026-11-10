"""Generated percussion bed — tabla-ish groove ~120 BPM + SFX.
In-house synthesis: sine/noise shaped envelopes, no samples, no license.
Outputs: music-loop.wav (8s, tiles), ting.wav, whoosh.wav, thud.wav,
pop.wav into video/audio/."""
import math, random, struct, wave, os

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "audio")
os.makedirs(OUT, exist_ok=True)
random.seed(7)

def w(name, frames):
    with wave.open(os.path.join(OUT, name), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(b"".join(struct.pack("<h",
            max(-32767, min(32767, int(x)))) for x in frames))

def env(i, sr=SR, a=0.002, d=0.08):
    t = i / sr
    return (1 - math.exp(-t / a)) * math.exp(-t / d)

def tabla(t, f0=200, f1=90, dur=0.22, amp=1.0):
    """tabla 'na/dha' — pitched sine drop + skin noise"""
    n = int(dur * SR)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        tt = i / SR
        f = f1 + (f0 - f1) * math.exp(-tt * 30)
        ph += 2 * math.pi * f / SR
        body = math.sin(ph) * env(i, a=0.001, d=dur * 0.5)
        skin = (random.random() * 2 - 1) * env(i, a=0.0005, d=0.012) * 0.35
        out[i] = (body * 0.8 + skin) * amp * 20000
    return out

def kick(t, dur=0.18, amp=1.0):
    n = int(dur * SR); out = [0.0] * n; ph = 0.0
    for i in range(n):
        tt = i / SR
        f = 40 + 80 * math.exp(-tt * 25)
        ph += 2 * math.pi * f / SR
        out[i] = math.sin(ph) * env(i, a=0.001, d=dur * 0.55) * amp * 24000
    return out

def clap(t, dur=0.12, amp=1.0):
    n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        tt = i / SR
        # 3 quick bursts = clap
        e = env(i, a=0.0005, d=0.05) + \
            (env(i - int(0.008 * SR), a=0.0005, d=0.05) if i >= int(0.008 * SR) else 0) + \
            (env(i - int(0.016 * SR), a=0.0005, d=0.07) if i >= int(0.016 * SR) else 0)
        out[i] = (random.random() * 2 - 1) * e * amp * 9000
    return out

def hat(t, dur=0.04, amp=0.5):
    n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        out[i] = (random.random() * 2 - 1) * env(i, a=0.0004, d=0.02) * amp * 7000
    return out

def ting(dur=1.1, amp=1.0):
    n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        tt = i / SR
        e = math.exp(-tt * 4.5)
        out[i] = (math.sin(2 * math.pi * 2800 * tt) * 0.6 +
                  math.sin(2 * math.pi * 4190 * tt) * 0.25 +
                  math.sin(2 * math.pi * 1870 * tt) * 0.35) * e * amp * 12000
    return out

def whoosh(dur=0.35, amp=1.0):
    n = int(dur * SR); out = [0.0] * n; prev = 0.0
    for i in range(n):
        tt = i / SR
        e = math.sin(math.pi * tt / dur) ** 1.5
        # rising-filtered noise (slow one-pole sweep feel)
        wv = random.random() * 2 - 1
        k = 0.02 + 0.35 * (tt / dur)
        prev = prev + k * (wv - prev)
        out[i] = (prev * 2.4 + wv * 0.15) * e * amp * 13000
    return out

def thud(dur=0.28, amp=1.0):
    return kick(dur, amp * 0.9)  # stamp slam reuses kick shape

def pop(dur=0.05, amp=1.0):
    n = int(dur * SR); out = [0.0] * n
    for i in range(n):
        tt = i / SR
        out[i] = (random.random() * 2 - 1) * env(i, a=0.0002, d=0.018) \
            * amp * 14000 + math.sin(2 * math.pi * 180 * tt) * \
            env(i, a=0.0002, d=0.03) * amp * 6000
    return out

# ---- 8s loop: 4 bars of 2s at 120BPM ----
LOOP = 8.0
frames = [0.0] * int(LOOP * SR)

def add(hit, at):
    s = int(at * SR)
    for i, x in enumerate(hit):
        if s + i < len(frames):
            frames[s + i] += x

for bar in range(4):
    b = bar * 2.0
    add(kick(0), b + 0.0)
    add(clap(0), b + 0.5)
    add(tabla(0, 240, 110, 0.18, 0.8), b + 0.75)
    add(kick(0), b + 1.0)
    add(clap(0), b + 1.5)
    add(tabla(0, 260, 120, 0.16, 0.7), b + 1.75)
    for h in range(8):
        add(hat(0, amp=0.35 if h % 2 else 0.5), b + h * 0.25)

# gentle master normalize
mx = max(abs(x) for x in frames) or 1
frames = [x * 28000 / mx for x in frames]
w("music-loop.wav", frames)
w("ting.wav", ting())
w("whoosh.wav", whoosh())
w("thud.wav", thud())
w("pop.wav", pop())
print("music + sfx written:", os.listdir(OUT))
